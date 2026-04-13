document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const imageInputToolbar = document.getElementById('imageInputToolbar');
    const dropzone = document.getElementById('dropzone');
    const tornPiecesContainer = document.getElementById('torn-pieces-container');
    const uiContainer = document.getElementById('ui-container');
    const toolbar = document.getElementById('toolbar');
    const resetBtn = document.getElementById('resetBtn');
    
    // Modes
    const modeTearBtn = document.getElementById('modeTear');
    const modePunchBtn = document.getElementById('modePunch');
    const punchControl = document.getElementById('punchControl');
    const punchSizeSlider = document.getElementById('punchSize');
    const punchPreview = document.getElementById('punchPreview');
    const modeDragBtn = document.getElementById('modeDrag');
    const modeDeleteBtn = document.getElementById('modeDelete');
    const crumpleBtn = document.getElementById('crumpleBtn');

    let currentMode = 'tear'; // 'tear', 'punch', 'drag', or 'delete'
    document.body.classList.add('mode-tear');

    function updateMode(newMode) {
        currentMode = newMode;
        modeTearBtn.classList.toggle('active', newMode === 'tear');
        modePunchBtn.classList.toggle('active', newMode === 'punch');
        modeDragBtn.classList.toggle('active', newMode === 'drag');
        modeDeleteBtn.classList.toggle('active', newMode === 'delete');
        punchControl.classList.toggle('hidden', newMode !== 'punch');
        punchPreview.style.display = newMode === 'punch' ? 'block' : 'none';

        document.body.classList.remove('mode-tear', 'mode-punch', 'mode-drag', 'mode-delete');
        document.body.classList.add(`mode-${newMode}`);
    }

    modeTearBtn.addEventListener('click', () => updateMode('tear'));
    modePunchBtn.addEventListener('click', () => updateMode('punch'));
    modeDragBtn.addEventListener('click', () => updateMode('drag'));
    modeDeleteBtn.addEventListener('click', () => updateMode('delete'));

    function updatePunchPreviewSize() {
        const size = parseFloat(punchSizeSlider.value) || 70;
        punchPreview.style.width = `${size * 2}px`;
        punchPreview.style.height = `${size * 2}px`;
    }
    punchSizeSlider.addEventListener('input', updatePunchPreviewSize);
    updatePunchPreviewSize(); // Initial sizing

    const handleUpload = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                await Promise.all(files.map(file => loadImagePromise(file)));
            }
        }
        e.target.value = ''; // Reset for re-uploading same file
    };

    imageInput.addEventListener('change', handleUpload);
    imageInputToolbar.addEventListener('change', handleUpload);

    document.body.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        if(!uiContainer.classList.contains('hidden')) dropzone.classList.add('dragover'); 
    });
    
    document.body.addEventListener('dragleave', (e) => { 
        if(!uiContainer.classList.contains('hidden')) dropzone.classList.remove('dragover'); 
    });
    
    document.body.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                await Promise.all(files.map(file => loadImagePromise(file)));
            }
        }
    });

    // Copy/Paste state
    let clipboardData = null;

    resetBtn.addEventListener('click', () => {
        tornPiecesContainer.innerHTML = '';
        uiContainer.classList.remove('hidden');
        dropzone.classList.remove('hidden'); 
        toolbar.classList.add('hidden');
    });

    function loadImagePromise(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    initCanvas(img);
                    uiContainer.classList.add('hidden');
                    dropzone.classList.add('hidden');
                    toolbar.classList.remove('hidden');
                    updateMode('drag');
                    resolve();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    let imageOffsetCount = 0;

    function initCanvas(img) {
        // Reduced max initial size so multiple photos look like scrapbook elements
        const maxW = Math.min(window.innerWidth * 0.4, 450);
        const maxH = Math.min(window.innerHeight * 0.4, 450);
        
        let w = img.width;
        let h = img.height;
        let scale = Math.min(maxW / w, maxH / h);
        if (scale < 1) {
            w = w * scale;
            h = h * scale;
        }

        const canvasW = w;
        const canvasH = h;

        const pieceCanvas = document.createElement('canvas');
        pieceCanvas.width = canvasW;
        pieceCanvas.height = canvasH;
        const ctx = pieceCanvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0, w, h);
        
        // Scatter randomly on the table, keep away from the top UI
        const minX = 40;
        const maxX = Math.max(minX, window.innerWidth - canvasW - 40);
        const minY = 180; // Below #ui-container
        const maxY = Math.max(minY, window.innerHeight - canvasH - 40);
        
        const startX = minX + Math.random() * (maxX - minX);
        const startY = minY + Math.random() * (maxY - minY);
        
        const rot = (Math.random() - 0.5) * 30; // Random tilt between -15 and 15 degrees
        
        createDraggableTornPiece(pieceCanvas, startX, startY, rot);
    }

    // --- Math & Splitting logic ---
    function vector(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        return {x: dx/len, y: dy/len};
    }

    function extendToCanvasEdge(p, v, w, h) {
        let hits = [];
        const eps = -1e-4;

        if (Math.abs(v.x) > 1e-6) {
            let t1 = -p.x / v.x;
            let y1 = p.y + t1*v.y;
            if (y1 >= eps && y1 <= h - eps) hits.push({x: 0, y: Math.max(0, Math.min(h, y1)), t: t1});
            
            let t2 = (w - p.x) / v.x;
            let y2 = p.y + t2*v.y;
            if (y2 >= eps && y2 <= h - eps) hits.push({x: w, y: Math.max(0, Math.min(h, y2)), t: t2});
        }
        if (Math.abs(v.y) > 1e-6) {
            let t3 = -p.y / v.y;
            let x1 = p.x + t3*v.x;
            if (x1 >= eps && x1 <= w - eps) hits.push({x: Math.max(0, Math.min(w, x1)), y: 0, t: t3});
            
            let t4 = (h - p.y) / v.y;
            let x2 = p.x + t4*v.x;
            if (x2 >= eps && x2 <= w - eps) hits.push({x: Math.max(0, Math.min(w, x2)), y: h, t: t4});
        }
        
        if (hits.length === 0) {
            return { x: Math.max(0, Math.min(w, p.x)), y: Math.max(0, Math.min(h, p.y)) };
        }
        
        hits.sort((a,b) => Math.abs(a.t) - Math.abs(b.t));
        return {x: hits[0].x, y: hits[0].y};
    }

    function getPerimeterPos(p, w, h) {
        const dists = [
            { edge: 'top', d: p.y, pos: p.x },
            { edge: 'right', d: w - p.x, pos: w + p.y },
            { edge: 'bottom', d: h - p.y, pos: w + h + (w - p.x) },
            { edge: 'left', d: p.x, pos: 2*w + h + (h - p.y) }
        ];
        dists.sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
        let pos = Math.max(0, Math.min(2*(w+h), dists[0].pos));
        if (pos >= 2*(w+h) - 1e-3) pos = 0; 
        return pos;
    }

    // Generates an asymmetric, section-based tear with paper fiber properties
    function addNoiseToPath(path, noiseFactor) {
        let totalLen = 0;
        const dists = [0];
        for (let i = 0; i < path.length - 1; i++) {
            const d = Math.hypot(path[i+1].x - path[i].x, path[i+1].y - path[i].y);
            totalLen += d;
            dists.push(totalLen);
        }

        const newPath = [];
        const resolution = 3; // Sample every 3px for high detail
        const numPoints = Math.max(2, Math.ceil(totalLen / resolution));
        
        let pathIdx = 0;
        let baseOffset = 0;
        let baseVelocity = 0;
        let isTearing = false; 
        let sectionRemaining = 0; 
        let tearDepth = 0;

        for (let step = 0; step <= numPoints; step++) {
            const currentDist = (step / numPoints) * totalLen;
            
            while (pathIdx < path.length - 2 && currentDist > dists[pathIdx + 1]) {
                pathIdx++;
            }
            
            const p1 = path[pathIdx];
            const p2 = path[pathIdx + 1];
            
            const segLen = dists[pathIdx+1] - dists[pathIdx] || 1;
            const t = (currentDist - dists[pathIdx]) / segLen;
            
            let x = p1.x + (p2.x - p1.x) * t;
            let y = p1.y + (p2.y - p1.y) * t;
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            
            // 1. Low-frequency continuous paper undulating
            baseVelocity += (Math.random() - 0.5) * 0.25;
            baseVelocity *= 0.94; // friction
            baseOffset += baseVelocity;
            
            // 2. Tear State Machine (Alternating smooth/jagged sections)
            sectionRemaining -= resolution;
            if (sectionRemaining <= 0) {
                if (isTearing) {
                    isTearing = false;
                    sectionRemaining = 30 + Math.random() * 50; // Smooth linear segment
                    tearDepth = 0;
                } else {
                    isTearing = true;
                    sectionRemaining = 10 + Math.random() * 35; // Jagged ripping segment
                    tearDepth = (Math.random() - 0.5) * noiseFactor * 8.0; 
                }
            }
            
            let currentTear = 0;
            if (isTearing) {
                // Envelope tear depth so it blends at edges
                const envelope = Math.sin((sectionRemaining) * 0.2) * 0.5 + 0.6;
                const rawTear = tearDepth * envelope;
                
                if (rawTear < 0) {
                    // Concave: Sharp, spikey, torn rapidly inwards
                    currentTear = rawTear * (Math.random() > 0.4 ? 1.5 : 0.2);
                } else {
                    // Convex: Rounder, pulling outwards more cohesively
                    currentTear = rawTear * (Math.random() * 0.15 + 0.85);
                }
            }
            
            // 3. High-frequency micro fibers along the entire edge
            const fiber = (Math.random() - 0.5) * 1.5;

            const total = baseOffset + currentTear + fiber;
            
            x += nx * total;
            y += ny * total;
            
            newPath.push({x, y});
        }
        
        newPath.push(path[path.length - 1]);
        return newPath;
    }

    function splitCanvas(sourceCanvasWrapper, userPath, isPerfectPunch = false) {
        const sourceCanvas = sourceCanvasWrapper.querySelector('canvas');
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        
        const bx = parseInt(sourceCanvasWrapper.style.left) || 0;
        const by = parseInt(sourceCanvasWrapper.style.top) || 0;
        const rotStr = sourceCanvasWrapper.style.transform;
        
        let rot = 0; let scale = 1;
        if(rotStr.includes('rotate')) { const match = rotStr.match(/rotate\(([-0-9.]+)deg\)/); if(match) rot = parseFloat(match[1]); }
        if(rotStr.includes('scale')) { const match = rotStr.match(/scale\(([-0-9.]+)\)/); if(match) scale = parseFloat(match[1]); }

        const first = userPath[0];
        const last = userPath[userPath.length - 1];
        const isClosedHole = userPath.length > 5 && Math.hypot(first.x - last.x, first.y - last.y) < 30; // Hole punch detection

        if (isClosedHole) {
            userPath.push({x: first.x, y: first.y}); // Seal loop fully
            let jaggedPath = isPerfectPunch ? userPath : addNoiseToPath(userPath, 4.0);
            
            let minX = w, minY = h, maxX = 0, maxY = 0;
            for(let p of jaggedPath) {
                if(p.x < minX) minX = p.x;
                if(p.x > maxX) maxX = p.x;
                if(p.y < minY) minY = p.y;
                if(p.y > maxY) maxY = p.y;
            }
            
            const hw = maxX - minX;
            const hh = maxY - minY;
            
            if (hw > 0 && hh > 0) {
                // 1. Create Hole Cutout Piece
                const holeCanvas = document.createElement('canvas');
                holeCanvas.width = hw; holeCanvas.height = hh;
                const hCtx = holeCanvas.getContext('2d');
                hCtx.translate(-minX, -minY);
                hCtx.beginPath();
                hCtx.moveTo(jaggedPath[0].x, jaggedPath[0].y);
                for(let i=1; i<jaggedPath.length; i++) hCtx.lineTo(jaggedPath[i].x, jaggedPath[i].y);
                hCtx.closePath();
                hCtx.clip();
                hCtx.drawImage(sourceCanvas, 0, 0);

                if (!isPerfectPunch) {
                    // Add styling to Hole Core
                    hCtx.lineCap = "round"; hCtx.lineJoin = "round";
                    hCtx.strokeStyle = "#fefcf8"; hCtx.lineWidth = 6; hCtx.stroke();
                    hCtx.strokeStyle = "rgba(255, 255, 255, 0.4)"; hCtx.lineWidth = 12; hCtx.stroke();
                    hCtx.strokeStyle = "rgba(255, 255, 255, 0.2)"; hCtx.lineWidth = 18; hCtx.stroke();
                }
                
                // 2. Create Frame Piece (Same size as original, but with a hole erasing it)
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = w; frameCanvas.height = h;
                const fCtx = frameCanvas.getContext('2d');
                fCtx.drawImage(sourceCanvas, 0, 0); 
                
                // Erase Hole
                fCtx.globalCompositeOperation = 'destination-out';
                fCtx.beginPath();
                fCtx.moveTo(jaggedPath[0].x, jaggedPath[0].y);
                for(let i=1; i<jaggedPath.length; i++) fCtx.lineTo(jaggedPath[i].x, jaggedPath[i].y);
                fCtx.closePath();
                fCtx.fill(); 
                
                if (!isPerfectPunch) {
                    // Stroke Frame Hole
                    fCtx.globalCompositeOperation = 'source-over';
                    fCtx.lineCap = "round"; fCtx.lineJoin = "round";
                    fCtx.strokeStyle = "#fefcf8"; fCtx.lineWidth = 6; fCtx.stroke();
                    fCtx.strokeStyle = "rgba(255, 255, 255, 0.4)"; fCtx.lineWidth = 12; fCtx.stroke();
                    fCtx.strokeStyle = "rgba(255, 255, 255, 0.2)"; fCtx.lineWidth = 18; fCtx.stroke();
                }
                
                const rotRad = rot * Math.PI / 180;
                
                // Spawn both components
                createDraggableTornPiece(frameCanvas, bx, by, rot, null, scale); // Frame handles w/2 so no shift
                
                const cx = w/2; const cy = h/2;
                const hcx = minX + hw/2; const hcy = minY + hh/2;
                const vx = hcx - cx; const vy = hcy - cy;
                const nvx = (vx * Math.cos(rotRad) - vy * Math.sin(rotRad)) * scale;
                const nvy = (vx * Math.sin(rotRad) + vy * Math.cos(rotRad)) * scale;
                
                const pcx = bx + w/2; const pcy = by + h/2;
                const exactLeft = pcx + nvx - hw/2;
                const exactTop = pcy + nvy - hh/2;
                
                createDraggableTornPiece(holeCanvas, exactLeft, exactTop, rot, null, scale);
                
                sourceCanvasWrapper.remove();
                return;
            }
        }

        // Extract clean starting vectors before noise!
        let startVecAvg = {x:0, y:0};
        const startEndLimit = Math.min(5, userPath.length - 1);
        for(let i=0; i<startEndLimit; i++) {
            startVecAvg.x += (userPath[i].x - userPath[i+1].x);
            startVecAvg.y += (userPath[i].y - userPath[i+1].y);
        }
        let v1 = {
            x: startVecAvg.x / Math.hypot(startVecAvg.x, startVecAvg.y) || 0,
            y: startVecAvg.y / Math.hypot(startVecAvg.x, startVecAvg.y) || 1
        };

        let endVecAvg = {x:0, y:0};
        const endStartLimit = userPath.length - 1 - Math.min(5, userPath.length - 1);
        for(let i=userPath.length-1; i>endStartLimit; i--) {
            endVecAvg.x += (userPath[i].x - userPath[i-1].x);
            endVecAvg.y += (userPath[i].y - userPath[i-1].y);
        }
        let vn = {
            x: endVecAvg.x / Math.hypot(endVecAvg.x, endVecAvg.y) || 0,
            y: endVecAvg.y / Math.hypot(endVecAvg.x, endVecAvg.y) || 1
        };

        let jaggedPath = addNoiseToPath(userPath, 4.0);
        
        let pStart = extendToCanvasEdge(jaggedPath[0], v1, w, h);
        let pEnd = extendToCanvasEdge(jaggedPath[jaggedPath.length-1], vn, w, h);
        
        jaggedPath = [pStart, ...jaggedPath, pEnd];

        const tA = getPerimeterPos(pEnd, w, h);
        const tB = getPerimeterPos(pStart, w, h);

        const corners = [
            {pos: 0, p: {x:0, y:0}},
            {pos: w, p: {x:w, y:0}},
            {pos: w+h, p: {x:w, y:h}},
            {pos: 2*w+h, p: {x:0, y:h}}
        ];

        let perimPts1 = [];
        for(let i=0; i<4; i++) {
            let cp = corners[i].pos;
            if (tA <= tB) {
                if (cp >= tA && cp <= tB) perimPts1.push(corners[i]);
            } else {
                if (cp >= tA || cp <= tB) perimPts1.push(corners[i]);
            }
        }
        perimPts1.sort((a,b) => {
            if (tA > tB) {
                if (a.pos >= tA && b.pos <= tB) return -1;
                if (b.pos >= tA && a.pos <= tB) return 1;
            }
            return a.pos - b.pos;
        });

        const poly1 = [...jaggedPath, ...perimPts1.map(c=>c.p)];

        let perimPts2 = [];
        for(let i=0; i<4; i++) {
            let cp = corners[i].pos;
            if (tB <= tA) {
                if (cp >= tB && cp <= tA) perimPts2.push(corners[i]);
            } else {
                if (cp >= tB || cp <= tA) perimPts2.push(corners[i]);
            }
        }
        perimPts2.sort((a,b) => {
            if (tB > tA) {
                if (a.pos >= tB && b.pos <= tA) return -1;
                if (b.pos >= tB && a.pos <= tA) return 1;
            }
            return a.pos - b.pos;
        });
        
        const poly2 = [...jaggedPath].reverse().concat(perimPts2.map(c=>c.p));

        // Variables bx, by, rot, scale are already defined at the top of splitCanvas.

        const createPieceFromPoly = (poly, isPoly1) => {
            let minX = w, minY = h, maxX = 0, maxY = 0;
            poly.forEach(p => {
                if(p.x < minX) minX = p.x;
                if(p.y < minY) minY = p.y;
                if(p.x > maxX) maxX = p.x;
                if(p.y > maxY) maxY = p.y;
            });

            minX = Math.floor(Math.max(0, minX - 5));
            minY = Math.floor(Math.max(0, minY - 5));
            maxX = Math.ceil(Math.min(w, maxX + 5));
            maxY = Math.ceil(Math.min(h, maxY + 5));

            const pw = maxX - minX;
            const ph = maxY - minY;

            if(pw <= 0 || ph <= 0) return;

            const newCanvas = document.createElement('canvas');
            newCanvas.width = pw;
            newCanvas.height = ph;
            const pCtx = newCanvas.getContext('2d');

            pCtx.translate(-minX, -minY);
            
            pCtx.beginPath();
            pCtx.moveTo(poly[0].x, poly[0].y);
            for(let i=1; i<poly.length; i++) pCtx.lineTo(poly[i].x, poly[i].y);
            pCtx.closePath();
            pCtx.clip();

            pCtx.drawImage(sourceCanvas, 0, 0);

            // Trace ONLY the torn edge (jaggedPath) for the white paper effects, skipping the original straight bounds
            pCtx.beginPath();
            if (isPoly1) {
                pCtx.moveTo(jaggedPath[0].x, jaggedPath[0].y);
                for(let i=1; i<jaggedPath.length; i++) pCtx.lineTo(jaggedPath[i].x, jaggedPath[i].y);
            } else {
                pCtx.moveTo(jaggedPath[jaggedPath.length-1].x, jaggedPath[jaggedPath.length-1].y);
                for(let i=jaggedPath.length-2; i>=0; i--) pCtx.lineTo(jaggedPath[i].x, jaggedPath[i].y);
            }

            pCtx.lineCap = "round"; 
            pCtx.lineJoin = "round";
            
            // Base opaque rim
            pCtx.strokeStyle = "#fefcf8"; 
            pCtx.lineWidth = 6;
            pCtx.stroke();

            // Transparent fibrous overlaps
            pCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            pCtx.lineWidth = 12;
            pCtx.stroke();
            
            pCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            pCtx.lineWidth = 18;
            pCtx.stroke();
            
            // Random paper chunk tabs (segment by segment)
            const drawnPath = isPoly1 ? jaggedPath : [...jaggedPath].reverse();
            let currentThickness = 0;
            
            for (let i = 0; i < drawnPath.length - 1; i++) {
                pCtx.beginPath();
                pCtx.moveTo(drawnPath[i].x, drawnPath[i].y);
                pCtx.lineTo(drawnPath[i+1].x, drawnPath[i+1].y);
                
                // Change thickness periodically to simulate paper pulling away clumps
                if (Math.random() > 0.85) {
                    if (Math.random() > 0.6) currentThickness = Math.random() * 6 + 6; // 6-12px tab
                    else currentThickness = 0;
                }
                
                if (currentThickness > 0) {
                    pCtx.lineWidth = currentThickness + 4;
                    pCtx.strokeStyle = "#fefcf8";
                    pCtx.stroke();
                }
            }

            let newRot = rot + (isPoly1 ? -2 : 2) + ((Math.random()-0.5)*2);
            
            // Calculate exact absolute offsets for custom size canvas around center origin
            const rotRad = rot * Math.PI / 180;
            const cx = w/2; const cy = h/2;
            const hcx = minX + pw/2; const hcy = minY + ph/2;
            const vx = hcx - cx; const vy = hcy - cy;
            const nvx = (vx * Math.cos(rotRad) - vy * Math.sin(rotRad)) * scale;
            const nvy = (vx * Math.sin(rotRad) + vy * Math.cos(rotRad)) * scale;
            
            const pcx = bx + w/2; const pcy = by + h/2;
            const exactLeft = pcx + nvx - pw/2;
            const exactTop = pcy + nvy - ph/2;

            const clipPathStr = 'polygon(' + poly.map(p => `${(p.x - minX).toFixed(1)}px ${(p.y - minY).toFixed(1)}px`).join(', ') + ')';

            createDraggableTornPiece(newCanvas, exactLeft, exactTop, newRot, clipPathStr, scale);
        };

        createPieceFromPoly(poly1, true);
        createPieceFromPoly(poly2, false);

        sourceCanvasWrapper.remove();
    }





    // --- High-Fidelity Procedural Grid Crumple Effect (Phase 1.3) ---
    function applyCrumpleEffect(wrapper) {
        if (!wrapper) return;
        const canvas = wrapper.querySelector('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = canvas.width;
        const h = canvas.height;

        if (!wrapper._sourceBuffer) {
            const buffer = document.createElement('canvas');
            buffer.width = w; buffer.height = h;
            buffer.getContext('2d').drawImage(canvas, 0, 0);
            wrapper._sourceBuffer = buffer;
        }

        const cols = 30; // High resolution for organic folds
        const rows = 30;

        // 1. Initialize Grid Mesh State
        if (!wrapper._mesh) {
            wrapper._mesh = {
                vertices: [],
                stressWaves: []
            };
            for (let y = 0; y <= rows; y++) {
                for (let x = 0; x <= cols; x++) {
                    const ux = (x / cols) * w;
                    const uy = (y / rows) * h;
                    wrapper._mesh.vertices.push({ x: ux, y: uy, z: 0, ux: ux, uy: uy });
                }
            }
        }

        const mesh = wrapper._mesh;

        // 2. Generate Procedural Stress Waves (Billow Noise basis)
        // Reduced max waves per click so the effect builds up more naturally
        const numWaves = 1 + Math.floor(Math.random() * 2);
        const maxDim = Math.max(w, h);
        for (let i = 0; i < numWaves; i++) {
            mesh.stressWaves.push({
                angle: Math.random() * Math.PI * 2,
                freq: 1.5 + Math.random() * 2.5,    // Broader folds, less dense
                phase: Math.random() * Math.PI * 2, 
                amplitude: 8 + Math.random() * 12,  // Shallower initial depth
                cx: Math.random() * w,
                cy: Math.random() * h,
                falloff: 0.3 + Math.random() * 1.0  // Wider area of effect
            });
        }

        // 3. Apply Deformation (Z depth and physical X/Y foreshortening)
        mesh.vertices.forEach(v => {
            let z = 0;
            mesh.stressWaves.forEach(wave => {
                const dx = v.ux - wave.cx;
                const dy = v.uy - wave.cy;
                const distSq = dx * dx + dy * dy;
                const rangeSq = maxDim * maxDim * wave.falloff;
                
                // Rapid cubic decay for organic, localized crushing
                const decay = Math.max(0, 1 - Math.pow(distSq / rangeSq, 1.5));
                
                const p = (v.ux * Math.cos(wave.angle) + v.uy * Math.sin(wave.angle)) / maxDim;
                
                // Math.abs(Math.sin) creates sharp V-shape valleys indicative of folded material
                // We add a slight power curve to make the valleys sharper and plateaus wider
                let waveVal = Math.abs(Math.sin(p * Math.PI * wave.freq + wave.phase));
                waveVal = Math.pow(waveVal, 1.2); 
                
                // Superimpose very low frequency micro-wrinkles (significantly dampened to prevent spikes)
                const micro = Math.sin(p * Math.PI * wave.freq * 2.5) * 0.02;
                
                z -= (waveVal + micro) * wave.amplitude * decay; 
            });
            v.z = z;
            
            // Physical Foreshortening: Pull points inward based on fold depth
            const cx = w / 2;
            const cy = h / 2;
            const shrink = Math.max(0.7, 1 + (v.z * 0.0035)); // Z is mostly negative
            
            // Organic lateral jitter simulating fiber tension
            const jitterX = (Math.random() - 0.5) * Math.abs(v.z * 0.08);
            const jitterY = (Math.random() - 0.5) * Math.abs(v.z * 0.08);

            v.x = cx + ((v.ux - cx) * shrink) + jitterX;
            v.y = cy + ((v.uy - cy) * shrink) + jitterY;
        });

        // 4. Rendering
        ctx.clearRect(0, 0, w, h);
        const source = wrapper._sourceBuffer;

        function getV(x, y) { return mesh.vertices[y * (cols + 1) + x]; }

        function drawTriangle(p1, p2, p3) {
            ctx.save();
            const cx = (p1.x + p2.x + p3.x) / 3;
            const cy = (p1.y + p2.y + p3.y) / 3;
            const dilate = 1.015; // Eliminate AA seams

            ctx.beginPath();
            ctx.moveTo(cx + (p1.x - cx) * dilate, cy + (p1.y - cy) * dilate);
            ctx.lineTo(cx + (p2.x - cx) * dilate, cy + (p2.y - cy) * dilate);
            ctx.lineTo(cx + (p3.x - cx) * dilate, cy + (p3.y - cy) * dilate);
            ctx.closePath();
            ctx.clip();

            const x1 = p1.ux, y1 = p1.uy, x2 = p2.ux, y2 = p2.uy, x3 = p3.ux, y3 = p3.uy;
            const u1 = p1.x, v1 = p1.y, u2 = p2.x, v2 = p2.y, u3 = p3.x, v3 = p3.y;
            const det = (x1-x3)*(y2-y3)-(x2-x3)*(y1-y3);
            
            if (Math.abs(det) > 0.01) { 
                const m11 = ((u1-u3)*(y2-y3)-(u2-u3)*(y1-y3))/det;
                const m12 = ((v1-v3)*(y2-y3)-(v2-v3)*(y1-y3))/det;
                const m21 = ((x1-x3)*(u2-u3)-(x2-x3)*(u1-u3))/det;
                const m22 = ((x1-x3)*(v2-v3)-(x2-x3)*(v1-v3))/det;
                const dx_ = u3 - m11 * x3 - m21 * y3;
                const dy_ = v3 - m12 * x3 - m22 * y3;
                ctx.setTransform(m11, m12, m21, m22, dx_, dy_);
                ctx.drawImage(source, 0, 0);
            }
            ctx.restore();
            
            // Directional 3D Shading
            const vx1 = p2.x - p1.x, vy1 = p2.y - p1.y, vz1 = p2.z - p1.z;
            const vx2 = p3.x - p1.x, vy2 = p3.y - p1.y, vz2 = p3.z - p1.z;
            
            let nx = vy1 * vz2 - vz1 * vy2;
            let ny = vz1 * vx2 - vx1 * vz2;
            let nz = vx1 * vy2 - vy1 * vx2;
            
            const nlen = Math.hypot(nx, ny, nz) || 1;
            nx /= nlen; ny /= nlen; nz /= nlen;
            if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; } 

            const lx = -0.5, ly = -0.7, lz = 0.5; 
            const dot = (nx * lx + ny * ly + nz * lz);
            
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Non-linear intensity scaling for sharper highlights, darker shadows
            let intensity = dot * 0.65; 
            intensity = Math.sign(intensity) * Math.pow(Math.abs(intensity), 1.3);

            if (Math.abs(intensity) > 0.02) {
                ctx.fillStyle = intensity > 0 
                    ? `rgba(255,255,255,${Math.min(0.9, intensity)})` 
                    : `rgba(0,0,0,${Math.min(0.9, -intensity)})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.fill();
            }
            // WIREFRAME STROKE REMOVED ENTIRELY
        }

        // Draw Grid Triangles (2 per square)
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const tl = getV(x, y);
                const tr = getV(x + 1, y);
                const bl = getV(x, y + 1);
                const br = getV(x + 1, y + 1);
                
                // Alternate diagonal to prevent directional artifacts
                if ((x + y) % 2 === 0) {
                    drawTriangle(tl, tr, bl);
                    drawTriangle(tr, br, bl);
                } else {
                    drawTriangle(tl, tr, br);
                    drawTriangle(tl, br, bl);
                }
            }
        }
        
        // 5. Update Silhouette Clip-Path for Jagged Organic Edges
        const outerPoly = [];
        for (let x = 0; x <= cols; x++) outerPoly.push(getV(x, 0));
        for (let y = 1; y <= rows; y++) outerPoly.push(getV(cols, y));
        for (let x = cols - 1; x >= 0; x--) outerPoly.push(getV(x, rows));
        for (let y = rows - 1; y >= 1; y--) outerPoly.push(getV(0, y));

        wrapper.style.clipPath = 'polygon(' + outerPoly.map(p => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(', ') + ')';
    }

    crumpleBtn.addEventListener('click', () => {
        if (!activePiece) return;
        applyCrumpleEffect(activePiece);
    });

    // --- Component Logic ---
    function createDraggableTornPiece(canvas, x, y, rotation, clipPath = null, currentScale = 1, initialOpacity = 1) {
        const wrapper = document.createElement('div');
        wrapper.className = 'torn-piece';
        wrapper.style.left = `${x}px`;
        wrapper.style.top = `${y}px`;
        
        let localScale = currentScale;
        let currentOpacity = initialOpacity;
        wrapper.style.transform = `rotate(${rotation}deg) scale(${localScale})`;
        wrapper.style.opacity = currentOpacity;
        if (clipPath) {
            wrapper.style.clipPath = clipPath;
        }
        
        wrapper.appendChild(canvas);
        tornPiecesContainer.appendChild(wrapper);

        let isInteracting = false;
        let startX, startY, initialLeft, initialTop;
        let userPath = [];
        let drawOverlay = null;
        let drawCtx = null;
        
        wrapper._scrapbookState = {
            get: () => ({ 
                canvas, 
                x: parseFloat(wrapper.style.left), 
                y: parseFloat(wrapper.style.top), 
                rotation: rotation,
                currentScale: localScale,
                opacity: currentOpacity,
                clipPath: clipPath, 
                zIndex: wrapper.style.zIndex 
            })
        };

        wrapper._updateTransforms = (rDelta, sDelta) => {
            rotation += rDelta;
            localScale *= sDelta;
            if (localScale < 0.2) localScale = 0.2;
            if (localScale > 5.0) localScale = 5.0;
            wrapper.style.transform = `rotate(${rotation}deg) scale(${localScale})`;
        };

        wrapper._updateOpacity = (newOpacity) => {
            currentOpacity = newOpacity;
            wrapper.style.opacity = currentOpacity;
        };

        // Scroll wheel event removed per user request

        wrapper.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if(e.button !== 0) return; // Only left click
            
            // Pixel-level Hit Testing (Ignore transparent holes)
            if (e.target === canvas) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const alpha = ctx.getImageData(e.offsetX, e.offsetY, 1, 1).data[3];
                if (alpha === 0) {
                    wrapper.style.pointerEvents = 'none';
                    const under = document.elementFromPoint(e.clientX, e.clientY);
                    wrapper.style.pointerEvents = 'auto'; // Restore immediately
                    if (under && typeof under.dispatchEvent === 'function') {
                        under.dispatchEvent(new PointerEvent(e.type, e));
                    }
                    return;
                }
            }
            
            activePiece = wrapper;

            if (currentMode === 'delete') {
                wrapper.remove();
                activePiece = null;
                return;
            }
            
            if (currentMode === 'punch') {
                const left = parseFloat(wrapper.style.left) || 0;
                const top = parseFloat(wrapper.style.top) || 0;
                const dx = e.clientX - left;
                const dy = e.clientY - top;
                const rotRad = -rotation * Math.PI / 180;
                const unrotatedDx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
                const unrotatedDy = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);
                const localX = unrotatedDx / localScale;
                const localY = unrotatedDy / localScale;
                
                const mockPath = [];
                // Absolute screen radius mapped to local canvas size
                const screenRadius = parseFloat(punchSizeSlider.value) || 70;
                const radius = screenRadius / localScale;
                for (let i = 0; i <= 36; i++) {
                    const angle = (i * 10) * Math.PI / 180;
                    mockPath.push({
                        x: localX + Math.cos(angle) * radius,
                        y: localY + Math.sin(angle) * radius
                    });
                }
                
                try {
                    splitCanvas(wrapper, mockPath, true);
                } catch(err) {
                    console.log("Failed to split canvas:", err);
                }
                return;
            }

            isInteracting = true;
            startX = e.clientX;
            startY = e.clientY;
            wrapper.setPointerCapture(e.pointerId);

            if (currentMode === 'drag') {
                let highestZ = 10;
                document.querySelectorAll('.torn-piece').forEach(p => {
                    const z = parseInt(p.style.zIndex) || 10;
                    if (z > highestZ) highestZ = z;
                });
                wrapper.style.zIndex = highestZ + 1;
                initialLeft = parseFloat(wrapper.style.left) || 0;
                initialTop = parseFloat(wrapper.style.top) || 0;
            } else if (currentMode === 'tear') {
                userPath = [];

                if (drawOverlay) { drawOverlay.remove(); }
                drawOverlay = document.createElement('canvas');
                drawOverlay.width = canvas.width;
                drawOverlay.height = canvas.height;
                drawOverlay.style.position = 'absolute';
                drawOverlay.style.top = '0';
                drawOverlay.style.left = '0';
                drawOverlay.style.pointerEvents = 'none';
                drawCtx = drawOverlay.getContext('2d');
                wrapper.appendChild(drawOverlay);
                
                addTearPoint(e);
            }
        });

        const addTearPoint = (e) => {
            const left = parseFloat(wrapper.style.left) || 0;
            const top = parseFloat(wrapper.style.top) || 0;
            
            const dx = e.clientX - left;
            const dy = e.clientY - top;
            
            const rotRad = -rotation * Math.PI / 180;
            const unrotatedDx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
            const unrotatedDy = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);
            
            const localX = unrotatedDx / localScale;
            const localY = unrotatedDy / localScale;
            
            if (userPath.length > 0) {
                const last = userPath[userPath.length - 1];
                const dist = Math.hypot(last.x - localX, last.y - localY);
                if (dist < 2) return;
            }
            
            userPath.push({x: localX, y: localY});
        };

        wrapper.addEventListener('pointermove', (e) => {
            if (!isInteracting) return;
            
            if (currentMode === 'drag') {
                e.preventDefault();
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                wrapper.style.left = `${initialLeft + dx}px`;
                wrapper.style.top = `${initialTop + dy}px`;
            } else if (currentMode === 'tear') {
                const prevLen = userPath.length;
                addTearPoint(e);
                
                if (userPath.length > prevLen && userPath.length > 1) {
                    drawCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
                    drawCtx.beginPath();
                    drawCtx.moveTo(userPath[0].x, userPath[0].y);
                    for(let i=1; i<userPath.length; i++) drawCtx.lineTo(userPath[i].x, userPath[i].y);
                    drawCtx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                    drawCtx.lineWidth = 2;
                    drawCtx.lineCap = "round";
                    drawCtx.lineJoin = "round";
                    drawCtx.setLineDash([4, 4]);
                    drawCtx.stroke();
                }
            }
        });

        wrapper.addEventListener('pointerup', (e) => {
            if (!isInteracting) return;
            isInteracting = false;
            wrapper.releasePointerCapture(e.pointerId);
            
            if (currentMode === 'drag') {
                // Drag complete
            } else if (currentMode === 'tear') {
                if(drawOverlay) {
                    drawOverlay.remove();
                    drawOverlay = null;
                }
                
                if(userPath.length > 5) {
                    let pathLength = 0;
                    for (let i = 1; i < userPath.length; i++) {
                        pathLength += Math.hypot(userPath[i].x - userPath[i-1].x, userPath[i].y - userPath[i-1].y);
                    }
                    if (pathLength > 30) {
                        try {
                             splitCanvas(wrapper, userPath);
                        } catch(err) {
                            console.log("Failed to split canvas:", err);
                        }
                    }
                }
            }
        });
    }

    // --- Global Keyboard Logic ---
    let activePiece = null;

    let isKeyTransforming = false;
    window.addEventListener('keydown', (e) => {
        if (!uiContainer.classList.contains('hidden')) return; // Strictly only allow shortcuts inside editor mode

        if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C')) {
            if (!activePiece) return;
            e.preventDefault();
            const stateFn = activePiece._scrapbookState;
            if (stateFn) clipboardData = stateFn.get();
        }

        if ((e.metaKey || e.ctrlKey) && (e.key === 'v' || e.key === 'V')) {
            if (!clipboardData) return;
            e.preventDefault();
            const s = clipboardData;
            
            const clonedCanvas = document.createElement('canvas');
            clonedCanvas.width = s.canvas.width;
            clonedCanvas.height = s.canvas.height;
            clonedCanvas.getContext('2d').drawImage(s.canvas, 0, 0);
            
            const newX = s.x + 30;
            const newY = s.y + 30;
            
            const newPiece = createDraggableTornPiece(clonedCanvas, newX, newY, s.rotation, s.clipPath, s.currentScale, s.opacity);
            
            let highestZ = 10;
            document.querySelectorAll('.torn-piece').forEach(p => {
                const z = parseInt(p.style.zIndex) || 10;
                if (z > highestZ) highestZ = z;
            });
            newPiece.style.zIndex = highestZ + 1;
            
            activePiece = newPiece;
            clipboardData.x = newX;
            clipboardData.y = newY;
            return;
        }

        if (!activePiece || !document.body.contains(activePiece)) return;

        if (e.key >= '0' && e.key <= '9') {
            const num = parseInt(e.key);
            const op = num === 0 ? 1.0 : Math.max(0.1, num / 10);
            if (activePiece._updateOpacity && activePiece.style.opacity !== op.toString()) {
                e.preventDefault();
                activePiece._updateOpacity(op);
            }
            return;
        }
    
        let currentZ = parseInt(activePiece.style.zIndex) || 10;

        if (e.key === 'Backspace' || e.key === 'Delete') {
            activePiece.remove();
            activePiece = null;
        } else if (e.key === ']') {
            activePiece.style.zIndex = currentZ + 1;
        } else if (e.key === '[') {
            activePiece.style.zIndex = currentZ - 1;
        } else if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') {
            e.preventDefault();
            if (activePiece._updateTransforms) { activePiece._updateTransforms(-5, 1); isKeyTransforming = true; }
        } else if (e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            if (activePiece._updateTransforms) { activePiece._updateTransforms(5, 1); isKeyTransforming = true; }
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === '+' || e.key === '=') {
            e.preventDefault();
            if (activePiece._updateTransforms) { activePiece._updateTransforms(0, 1.1); isKeyTransforming = true; }
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === '-' || e.key === '_') {
            e.preventDefault();
            if (activePiece._updateTransforms) { activePiece._updateTransforms(0, 0.9); isKeyTransforming = true; }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (isKeyTransforming) {
            isKeyTransforming = false;
        }
    });

    // Global pointer move tracking for Punch preview
    window.addEventListener('pointermove', (e) => {
        if (currentMode === 'punch' && punchPreview.style.display !== 'none') {
            punchPreview.style.left = `${e.clientX}px`;
            punchPreview.style.top = `${e.clientY}px`;
        }
    });

    document.getElementById('workspace').addEventListener('mousedown', (e) => {
        if (e.target === document.getElementById('workspace') || e.target === tornPiecesContainer) {
            activePiece = null;
        }
    });
});
