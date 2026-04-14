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
    const tearControl = document.getElementById('tearControl');
    const toggleTornEdge = document.getElementById('toggleTornEdge');
    const tornEdgeColorInput = document.getElementById('tornEdgeColorInput');
    const punchControl = document.getElementById('punchControl');
    const punchSizeSlider = document.getElementById('punchSize');
    const frostControl = document.getElementById('frostControl');
    const frostSizeSlider = document.getElementById('frostSize');
    const punchPreview = document.getElementById('punchPreview');
    const modeDragBtn = document.getElementById('modeDrag');
    const modeFrostBtn = document.getElementById('modeFrost');
    const modeClipBtn = document.getElementById('modeClip');
    const modeDeleteBtn = document.getElementById('modeDelete');
    const toggleWetFrost = document.getElementById('toggleWetFrost');
    const clipControl = document.getElementById('clipControl');
    const clipStatus = document.getElementById('clipStatus');
    const finishClipBtn = document.getElementById('finishClip');

    const dpr = window.devicePixelRatio || 1;

    let currentMode = 'tear'; 
    let wetFrostEnabled = true;
    let selectedPiecesForClip = [];
    let tornEdgeEnabled = true;
    let tornEdgeColor = '#fefcf8';
    document.body.classList.add('mode-tear');

    function updateMode(newMode) {
        currentMode = newMode;
        modeTearBtn.classList.toggle('active', newMode === 'tear');
        modePunchBtn.classList.toggle('active', newMode === 'punch');
        modeDragBtn.classList.toggle('active', newMode === 'drag');
        modeFrostBtn.classList.toggle('active', newMode === 'frost');
        modeClipBtn.classList.toggle('active', newMode === 'clip');
        modeDeleteBtn.classList.toggle('active', newMode === 'delete');
        
        tearControl.classList.toggle('hidden', newMode !== 'tear');
        punchControl.classList.toggle('hidden', newMode !== 'punch');
        frostControl.classList.toggle('hidden', newMode !== 'frost');
        clipControl.classList.toggle('hidden', newMode !== 'clip');
        
        punchPreview.style.display = newMode === 'punch' ? 'block' : 'none';

        document.body.classList.remove('mode-tear', 'mode-punch', 'mode-drag', 'mode-frost', 'mode-delete', 'mode-clip');
        document.body.classList.add(`mode-${newMode}`);
        
        // Reset selection when changing modes
        if (newMode !== 'clip') {
            selectedPiecesForClip.forEach(p => p.classList.remove('clip-selected'));
            selectedPiecesForClip = [];
            clipStatus.textContent = "Select 2+";
            finishClipBtn.disabled = true;
        }
        
        // When entering frost mode, trigger the frosted glass generation on the currently active piece
        if (newMode === 'frost' && activePiece && activePiece._sourceBuffer && !activePiece._frostedBuffer) {
            applyFrostEffect(activePiece);
        }
    }

    modeTearBtn.addEventListener('click', () => updateMode('tear'));
    modePunchBtn.addEventListener('click', () => updateMode('punch'));
    modeDragBtn.addEventListener('click', () => updateMode('drag'));
    modeFrostBtn.addEventListener('click', () => updateMode('frost'));
    modeClipBtn.addEventListener('click', () => updateMode('clip'));
    modeDeleteBtn.addEventListener('click', () => updateMode('delete'));

    finishClipBtn.addEventListener('click', () => {
        if (selectedPiecesForClip.length >= 2) {
            clipStatus.textContent = "Stacking...";
            const piecesToStack = [...selectedPiecesForClip];
            selectedPiecesForClip = [];
            
            // Clean up highlight on pieces
            piecesToStack.forEach(p => p.classList.remove('clip-selected'));
            
            createPaperclipStack(piecesToStack);
            
            finishClipBtn.disabled = true;
            updateMode('drag');
        }
    });

    toggleWetFrost.addEventListener('click', () => {
        wetFrostEnabled = !wetFrostEnabled;
        toggleWetFrost.classList.toggle('active', wetFrostEnabled);
        toggleWetFrost.textContent = wetFrostEnabled ? '💧' : '🚫';
    });

    toggleTornEdge.addEventListener('change', () => {
        tornEdgeEnabled = toggleTornEdge.checked;
    });

    tornEdgeColorInput.addEventListener('input', () => {
        tornEdgeColor = tornEdgeColorInput.value;
    });

    function hexToRgba(hex, alpha) {
        let r = 255, g = 255, b = 255;
        if (hex.startsWith('#')) {
            const h = hex.replace('#','');
            if (h.length === 3) {
                r = parseInt(h[0]+h[0], 16);
                g = parseInt(h[1]+h[1], 16);
                b = parseInt(h[2]+h[2], 16);
            } else {
                r = parseInt(h.substring(0,2), 16);
                g = parseInt(h.substring(2,4), 16);
                b = parseInt(h.substring(4,6), 16);
            }
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function updatePunchPreviewSize() {
        if (currentMode !== 'punch') {
            punchPreview.style.display = 'none';
            return;
        }
        punchPreview.style.display = 'block';
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
        // High-DPI Setup
        pieceCanvas.width = canvasW * dpr;
        pieceCanvas.height = canvasH * dpr;
        pieceCanvas.style.width = `${canvasW}px`;
        pieceCanvas.style.height = `${canvasH}px`;
        
        const ctx = pieceCanvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
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
        const w = sourceCanvas.width / dpr;
        const h = sourceCanvas.height / dpr;
        
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
                holeCanvas.width = hw * dpr; holeCanvas.height = hh * dpr;
                holeCanvas.style.width = `${hw}px`; holeCanvas.style.height = `${hh}px`;
                const hCtx = holeCanvas.getContext('2d');
                hCtx.scale(dpr, dpr);
                hCtx.translate(-minX, -minY);
                hCtx.beginPath();
                hCtx.moveTo(jaggedPath[0].x, jaggedPath[0].y);
                for(let i=1; i<jaggedPath.length; i++) hCtx.lineTo(jaggedPath[i].x, jaggedPath[i].y);
                hCtx.closePath();
                hCtx.clip();
                hCtx.drawImage(sourceCanvas, 0, 0, w, h);

                if (!isPerfectPunch) {
                    // Add styling to Hole Core
                    hCtx.lineCap = "round"; hCtx.lineJoin = "round";
                    hCtx.strokeStyle = "#fefcf8"; hCtx.lineWidth = 6; hCtx.stroke();
                    hCtx.strokeStyle = "rgba(255, 255, 255, 0.4)"; hCtx.lineWidth = 12; hCtx.stroke();
                    hCtx.strokeStyle = "rgba(255, 255, 255, 0.2)"; hCtx.lineWidth = 18; hCtx.stroke();
                }
                
                // 2. Create Frame Piece (Same size as original, but with a hole erasing it)
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = w * dpr; frameCanvas.height = h * dpr;
                frameCanvas.style.width = `${w}px`; frameCanvas.style.height = `${h}px`;
                const fCtx = frameCanvas.getContext('2d');
                fCtx.scale(dpr, dpr);
                fCtx.drawImage(sourceCanvas, 0, 0, w, h); 
                
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
            newCanvas.width = pw * dpr;
            newCanvas.height = ph * dpr;
            newCanvas.style.width = `${pw}px`;
            newCanvas.style.height = `${ph}px`;
            
            const pCtx = newCanvas.getContext('2d');
            pCtx.scale(dpr, dpr);
            pCtx.translate(-minX, -minY);
            
            pCtx.beginPath();
            pCtx.moveTo(poly[0].x, poly[0].y);
            for(let i=1; i<poly.length; i++) pCtx.lineTo(poly[i].x, poly[i].y);
            pCtx.closePath();
            pCtx.clip();

            pCtx.drawImage(sourceCanvas, 0, 0, w, h);

            // Trace ONLY the torn edge (jaggedPath) for the white paper effects, skipping the original straight bounds
            pCtx.lineCap = "round"; 
            pCtx.lineJoin = "round";
            
            // Mask the fiber edges to the actual content pixels
            // pCtx.globalCompositeOperation = 'source-atop'; // We manage this dynamically now!

            if (tornEdgeEnabled) {
                const drawnPath = isPoly1 ? jaggedPath : [...jaggedPath].reverse();
                
                // Center of the piece bounding box (in absolute coords relative to the source clip)
                let centerAbsX = minX + pw / 2;
                let centerAbsY = minY + ph / 2;

                let inkPath = [];
                let basePeel = isPoly1 ? 12 : 2;
                let currentPeel = basePeel;
                
                for (let i = 0; i < drawnPath.length; i++) {
                    // Randomly drift the peel amount for fibrous look
                    currentPeel += (Math.random() - 0.5) * 8; // Change per step
                    
                    // Clamp thickness
                    let minPeel = isPoly1 ? 4 : 0;
                    let maxPeel = isPoly1 ? 25 : 6;
                    if (currentPeel < minPeel) currentPeel = minPeel;
                    if (currentPeel > maxPeel) currentPeel = maxPeel;

                    let px = drawnPath[i].x;
                    let py = drawnPath[i].y;
                    
                    let vx = centerAbsX - px;
                    let vy = centerAbsY - py;
                    let len = Math.hypot(vx, vy) || 1;
                    
                    inkPath.push({
                        x: px + (vx / len) * currentPeel,
                        y: py + (vy / len) * currentPeel
                    });
                }

                // 1. ERASE the image coating in the peel region to reveal "transparent" background
                pCtx.globalCompositeOperation = 'destination-out';
                pCtx.beginPath();
                pCtx.moveTo(drawnPath[0].x, drawnPath[0].y);
                for (let i = 1; i < drawnPath.length; i++) pCtx.lineTo(drawnPath[i].x, drawnPath[i].y);
                for (let i = inkPath.length - 1; i >= 0; i--) pCtx.lineTo(inkPath[i].x, inkPath[i].y);
                pCtx.closePath();
                pCtx.fill();
                
                // 2. FILL the peeled region with the physical paper core color! 
                // Using destination-over puts it behind the image layer, filling the transparent gap seamlessly.
                pCtx.globalCompositeOperation = 'destination-over';
                pCtx.fillStyle = tornEdgeColor;
                pCtx.fill();

                // 3. Draw cast shadow from the coating edge ONTO the paper core
                pCtx.globalCompositeOperation = 'source-atop'; // Draw over existing pixels normally
                
                pCtx.save();
                // Clip so we ONLY draw shadow on the paper layer, NOT over the image!
                pCtx.beginPath();
                pCtx.moveTo(drawnPath[0].x, drawnPath[0].y);
                for (let i = 1; i < drawnPath.length; i++) pCtx.lineTo(drawnPath[i].x, drawnPath[i].y);
                for (let i = inkPath.length - 1; i >= 0; i--) pCtx.lineTo(inkPath[i].x, inkPath[i].y);
                pCtx.closePath();
                pCtx.clip();

                // Draw the actual shadow line along the ink edge
                pCtx.beginPath();
                pCtx.moveTo(inkPath[0].x, inkPath[0].y);
                for (let i = 1; i < inkPath.length; i++) pCtx.lineTo(inkPath[i].x, inkPath[i].y);
                
                pCtx.lineWidth = isPoly1 ? 6 : 2; // Darker shadow for thicker peel
                pCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                pCtx.lineCap = "round";
                pCtx.lineJoin = "round";
                // Adding a slight blur makes it vastly more realistic as a shadow!
                pCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                pCtx.shadowBlur = 4;
                pCtx.stroke();
                
                // Add tiny physical paper fibers scattered on the paper core!
                pCtx.lineWidth = 1;
                pCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Slight highlight fibers
                for (let i = 0; i < drawnPath.length - 1; i+=2) {
                    if (Math.random() > 0.3) {
                        pCtx.beginPath();
                        pCtx.moveTo(inkPath[i].x, inkPath[i].y);
                        // Fiber ends randomly near drawnPath
                        let fx = drawnPath[i].x + (Math.random() - 0.5) * 6;
                        let fy = drawnPath[i].y + (Math.random() - 0.5) * 6;
                        pCtx.lineTo(fx, fy);
                        pCtx.stroke();
                    }
                }
                
                pCtx.restore();
            }

            // Reset composite mode to default
            pCtx.globalCompositeOperation = 'source-over';

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

            const newPiece = createDraggableTornPiece(newCanvas, exactLeft, exactTop, newRot, clipPathStr, scale);
            
            // Re-apply Frost Glass layer if present on parent
            if (sourceCanvasWrapper._frostedBuffer) {
                const newFrost = document.createElement('canvas');
                newFrost.width = pw * dpr;
                newFrost.height = ph * dpr;
                newFrost.style.width = `${pw}px`;
                newFrost.style.height = `${ph}px`;

                const fCtx = newFrost.getContext('2d', { willReadFrequently: true });
                fCtx.scale(dpr, dpr);
                fCtx.translate(-minX, -minY);
                fCtx.beginPath();
                fCtx.moveTo(poly[0].x, poly[0].y);
                for(let i=1; i<poly.length; i++) fCtx.lineTo(poly[i].x, poly[i].y);
                fCtx.closePath();
                fCtx.clip();
                
                fCtx.drawImage(sourceCanvasWrapper._frostedBuffer, 0, 0, w, h);
                
                newFrost.className = 'frost-overlay';
                newFrost.style.position = 'absolute';
                newFrost.style.top = '0';
                newFrost.style.left = '0';
                newFrost.style.pointerEvents = 'none';
                newFrost.style.zIndex = '5';
                
                // Also initialize the transient water head buffer for the new pieces
                const newWater = document.createElement('canvas');
                newWater.width = pw * dpr;
                newWater.height = ph * dpr;
                newWater.style.width = `${pw}px`;
                newWater.style.height = `${ph}px`;

                const wCtx = newWater.getContext('2d');
                wCtx.scale(dpr, dpr);

                newWater.className = 'water-overlay';
                newWater.style.position = 'absolute';
                newWater.style.top = '0';
                newWater.style.left = '0';
                newWater.style.pointerEvents = 'none';
                newWater.style.zIndex = '6';
                newPiece.appendChild(newWater);
                newPiece._waterBuffer = newWater;

                // Preserve original raw un-frosted source wrapper
                if (sourceCanvasWrapper._sourceBuffer) {
                    const srcBuffer = document.createElement('canvas');
                    srcBuffer.width = pw * dpr; srcBuffer.height = ph * dpr;
                    srcBuffer.style.width = `${pw}px`;
                    srcBuffer.style.height = `${ph}px`;

                    const bCtx = srcBuffer.getContext('2d', { willReadFrequently: true });
                    bCtx.scale(dpr, dpr);
                    bCtx.translate(-minX, -minY);
                    bCtx.beginPath();
                    bCtx.moveTo(poly[0].x, poly[0].y);
                    for(let i=1; i<poly.length; i++) bCtx.lineTo(poly[i].x, poly[i].y);
                    bCtx.closePath();
                    bCtx.clip();
                    bCtx.drawImage(sourceCanvasWrapper._sourceBuffer, 0, 0, w, h);
                    newPiece._sourceBuffer = srcBuffer;
                }
                newPiece._droplets = []; 
                newPiece._physicsLoop = true;
                runDropletPhysics(newPiece);
            }
        };

        createPieceFromPoly(poly1, true);
        createPieceFromPoly(poly2, false);

        sourceCanvasWrapper.remove();
    }





    // --- Frost Wipe Effect with Physics Droplets ---
    function applyFrostEffect(wrapper) {
        if (!wrapper || wrapper._frostedBuffer) return;
        const sourceCanvas = wrapper.querySelector('canvas');
        if (!sourceCanvas || sourceCanvas.classList.contains('frost-overlay')) return;
        
        const w = sourceCanvas.width / dpr;
        const h = sourceCanvas.height / dpr;

        if (!wrapper._sourceBuffer) {
            const buffer = document.createElement('canvas');
            buffer.width = w * dpr; buffer.height = h * dpr;
            buffer.style.width = `${w}px`;
            buffer.style.height = `${h}px`;
            const bCtx = buffer.getContext('2d', {willReadFrequently:true});
            bCtx.scale(dpr, dpr);
            bCtx.drawImage(sourceCanvas, 0, 0, w, h);
            wrapper._sourceBuffer = buffer;
        }

        const frostCanvas = document.createElement('canvas');
        frostCanvas.width = w * dpr; frostCanvas.height = h * dpr;
        frostCanvas.style.width = `${w}px`;
        frostCanvas.style.height = `${h}px`;

        frostCanvas.className = 'frost-overlay';
        frostCanvas.style.position = 'absolute';
        frostCanvas.style.top = '0';
        frostCanvas.style.left = '0';
        frostCanvas.style.pointerEvents = 'none';
        frostCanvas.style.zIndex = '5'; // Render above the sharp image
        
        const fctx = frostCanvas.getContext('2d', { willReadFrequently: true });
        fctx.scale(dpr, dpr);
        
        // Create solid frosted layer (heavy blur + tint overlay)
        fctx.filter = 'blur(12px)';
        fctx.drawImage(wrapper._sourceBuffer, 0, 0, w, h);
        fctx.filter = 'none';
        
        fctx.globalCompositeOperation = 'source-over';
        fctx.fillStyle = 'rgba(230, 240, 255, 0.4)'; // Icy condensation fog
        fctx.fillRect(0, 0, w, h);

        const waterCanvas = document.createElement('canvas');
        waterCanvas.width = w * dpr; waterCanvas.height = h * dpr;
        waterCanvas.style.width = `${w}px`;
        waterCanvas.style.height = `${h}px`;

        const wctx = waterCanvas.getContext('2d');
        wctx.scale(dpr, dpr);

        waterCanvas.className = 'water-overlay';
        waterCanvas.style.position = 'absolute';
        waterCanvas.style.top = '0';
        waterCanvas.style.left = '0';
        waterCanvas.style.pointerEvents = 'none';
        waterCanvas.style.zIndex = '6'; // Render above the frost mask

        wrapper.appendChild(frostCanvas);
        wrapper.appendChild(waterCanvas);
        wrapper._frostedBuffer = frostCanvas;
        wrapper._waterBuffer = waterCanvas;
        wrapper._droplets = []; 
        
        if (!wrapper._physicsLoop) {
            wrapper._physicsLoop = true;
            runDropletPhysics(wrapper);
        }
    }

    function runDropletPhysics(wrapper) {
        if (!wrapper._frostedBuffer || !wrapper._waterBuffer || !wrapper._physicsLoop) return;
        const fctx = wrapper._frostedBuffer.getContext('2d');
        const wctx = wrapper._waterBuffer.getContext('2d');
        const droplets = wrapper._droplets;
        const w = wrapper._frostedBuffer.width / dpr;
        const h = wrapper._frostedBuffer.height / dpr;
        
        // Clear the transient water bead layer every frame
        wctx.clearRect(0, 0, w, h);

        if (droplets.length > 0) {
            for(let i = droplets.length - 1; i >= 0; i--) {
                const drop = droplets[i];
                
                if (!drop.stagnant) {
                    drop.speed += 0.005; // extremely slow gravity pulls the droplet down
                    if (drop.speed > 0.6) drop.speed = 0.6; // very slow terminal velocity
                    
                    const prevY = drop.y;
                    drop.y += drop.speed;
                    // Slowly evaporate to simulate water loss during movement
                    if (drop.mass > 1.5) drop.mass -= 0.002; 
                    
                    const r = drop.mass; 

                    // 1. Persistent erasure: The falling drop ERASES frost behind it permanently
                    fctx.globalCompositeOperation = 'destination-out';
                    fctx.lineCap = 'round';
                    fctx.lineJoin = 'round';
                    fctx.lineWidth = r * 2.0;
                    fctx.beginPath();
                    fctx.moveTo(drop.x, prevY - r*0.5); 
                    fctx.lineTo(drop.x, drop.y);
                    fctx.stroke();

                    // Surface tension brake: 1.5% chance per frame (or leaving screen bounds)
                    if (Math.random() < 0.015 || drop.y > h + r) { 
                        if (drop.y <= h) {
                            drop.stagnant = true;
                            drop.timer = 180 + Math.random() * 240; // 3-7 seconds of stay
                        } else {
                            droplets.splice(i, 1);
                            continue;
                        }
                    }
                } else {
                    // Stagnant logic: Wait, then evaporate
                    if (drop.timer > 0) {
                        drop.timer--;
                    } else {
                        // Evaporate: reduce mass quickly
                        drop.mass -= 0.015;
                        if (drop.mass <= 0) {
                            droplets.splice(i, 1);
                            continue;
                        }
                    }
                }
                
                // 2. Transient rendering: Draw the visual water bead into the water layer
                const r = drop.mass;
                wctx.globalCompositeOperation = 'source-over';
                
                // Dark bottom refractive edge
                wctx.fillStyle = 'rgba(0,0,0,0.4)';
                wctx.beginPath();
                wctx.arc(drop.x, drop.y, r, 0, Math.PI*2);
                wctx.fill();
                
                // Bright specular lighting on top
                wctx.fillStyle = 'rgba(255,255,255,0.95)';
                wctx.beginPath();
                wctx.arc(drop.x, drop.y - r*0.3, r*0.6, 0, Math.PI*2);
                wctx.fill();
            }
        }
        
        requestAnimationFrame(() => runDropletPhysics(wrapper));
    }

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

        wrapper.addEventListener('contextmenu', (e) => {
            if (currentMode === 'frost' && wrapper._frostedBuffer) {
                e.preventDefault();
                
                // Bake the image into a flat piece so it can be conventionally cut without interactive side effects
                const bakedCanvas = document.createElement('canvas');
                const cssW = canvas.width / dpr;
                const cssH = canvas.height / dpr;
                
                bakedCanvas.width = cssW * dpr;
                bakedCanvas.height = cssH * dpr;
                bakedCanvas.style.width = `${cssW}px`;
                bakedCanvas.style.height = `${cssH}px`;
                
                const bCtx = bakedCanvas.getContext('2d');
                bCtx.scale(dpr, dpr);
                
                bCtx.drawImage(wrapper._sourceBuffer || canvas, 0, 0, cssW, cssH);
                bCtx.drawImage(wrapper._frostedBuffer, 0, 0, cssW, cssH);
                
                const left = parseFloat(wrapper.style.left) || 0;
                const top = parseFloat(wrapper.style.top) || 0;
                
                createDraggableTornPiece(bakedCanvas, left, top, rotation, clipPath, localScale, currentOpacity);
                
                wrapper.remove();
                if (activePiece === wrapper) activePiece = null;
            }
        });

        wrapper.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if(e.button !== 0) return; // Only left click
            
            // Pixel-level Hit Testing (Ignore transparent holes)
            if (e.target === canvas) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                // Account for DPR when sampling pixels
                const alpha = ctx.getImageData(e.offsetX * dpr, e.offsetY * dpr, 1, 1).data[3];
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

            if (currentMode === 'clip') {
                if (selectedPiecesForClip.includes(wrapper)) {
                    // Deselect
                    selectedPiecesForClip = selectedPiecesForClip.filter(p => p !== wrapper);
                    wrapper.classList.remove('clip-selected');
                } else {
                    // Select
                    selectedPiecesForClip.push(wrapper);
                    wrapper.classList.add('clip-selected');
                }
                
                const count = selectedPiecesForClip.length;
                if (count >= 2) {
                    clipStatus.textContent = `${count} selected`;
                    finishClipBtn.disabled = false;
                } else if (count === 1) {
                    clipStatus.textContent = "Select another...";
                    finishClipBtn.disabled = true;
                } else {
                    clipStatus.textContent = "Select 2+";
                    finishClipBtn.disabled = true;
                }
                return;
            }

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
                const cssW = canvas.width / dpr;
                const cssH = canvas.height / dpr;
                
                drawOverlay.width = cssW * dpr;
                drawOverlay.height = cssH * dpr;
                drawOverlay.style.width = `${cssW}px`;
                drawOverlay.style.height = `${cssH}px`;
                
                drawOverlay.style.position = 'absolute';
                drawOverlay.style.top = '0';
                drawOverlay.style.left = '0';
                drawOverlay.style.pointerEvents = 'none';
                drawCtx = drawOverlay.getContext('2d');
                drawCtx.scale(dpr, dpr);
                wrapper.appendChild(drawOverlay);
                
                addTearPoint(e);
            } else if (currentMode === 'frost') {
                if (!wrapper._frostedBuffer) {
                    applyFrostEffect(wrapper);
                    isInteracting = false; // Consume the click so the user must click-and-drag again to wipe
                    wrapper.releasePointerCapture(e.pointerId);
                    return;
                }
                wrapper._lastWipe = null;
                wipePoint(e);
            }
        });

        const wipePoint = (e) => {
            if (!wrapper._frostedBuffer) return;
            const left = parseFloat(wrapper.style.left) || 0;
            const top = parseFloat(wrapper.style.top) || 0;
            
            const dx = e.clientX - left;
            const dy = e.clientY - top;
            
            const rotRad = -rotation * Math.PI / 180;
            const unrotatedDx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
            const unrotatedDy = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);
            
            const localX = unrotatedDx / localScale;
            const localY = unrotatedDy / localScale;

            const fctx = wrapper._frostedBuffer.getContext('2d');
            
            // "Wiping" is physically cutting out the frosted layer to reveal the sharp image
            fctx.globalCompositeOperation = 'destination-out';
            fctx.lineCap = 'round';
            fctx.lineJoin = 'round';
            const brushSize = (parseFloat(frostSizeSlider.value) || 45) / localScale;
            fctx.lineWidth = brushSize * 2; // Full stroke width

            if (wrapper._lastWipe) {
                fctx.beginPath();
                fctx.moveTo(wrapper._lastWipe.x, wrapper._lastWipe.y);
                fctx.lineTo(localX, localY);
                fctx.stroke();
            } else {
                fctx.beginPath();
                fctx.arc(localX, localY, brushSize, 0, Math.PI * 2);
                fctx.fill();
            }
            wrapper._lastWipe = { x: localX, y: localY };

            // Wiping physics: moisture is displaced to the bottom edge of the finger swipe.
            // Rather than spraying droplets directly under the mouse like a particle brush, heavy 
            // water globules condense and detach purely from the lower perimeter of the wiped area!
            if (wetFrostEnabled && Math.random() < 0.1) { 
                wrapper._droplets.push({
                    x: localX + (Math.random() - 0.5) * brushSize * 1.6, // Spread along the width of the finger
                    y: localY + brushSize * 0.9, // Spawn specifically at the bottom edge boundary
                    mass: Math.min(20, brushSize * 0.4), 
                    speed: 0
                });
            }
        };

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
            } else if (currentMode === 'frost') {
                wipePoint(e);
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
            } else if (currentMode === 'frost') {
                wrapper._lastWipe = null;
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
    function createPaperclipStack(pieces) {
        if (!pieces || pieces.length < 2) return;

        // 1. Calculate the center of the selection to align the stack
        let sumX = 0, sumY = 0;
        pieces.forEach(p => {
            sumX += parseFloat(p.style.left) || 0;
            sumY += parseFloat(p.style.top) || 0;
        });
        const stackX = sumX / pieces.length;
        const stackY = sumY / pieces.length;

        // 2. Prepare the pieces: remove 'clip-selected' and align them
        pieces.forEach((p, idx) => {
            p.classList.remove('clip-selected');
            p.style.left = `${stackX}px`;
            p.style.top = `${stackY}px`;
            // Add a slight random tilt for a natural paper stack look
            const randomRotation = (Math.random() - 0.5) * 6;
            const currentScale = p._scrapbookState.get().currentScale || 1;
            p.style.transform = `rotate(${randomRotation}deg) scale(${currentScale})`;
            p.style.zIndex = 100 + idx;
        });

        // 3. Create the Visual Clip Component
        const clip = document.createElement('div');
        clip.className = 'paper-binder-clip';
        clip.style.left = `${stackX + 50}px`; // Representative offset
        clip.style.top = `${stackY}px`;
        tornPiecesContainer.appendChild(clip);

        // 4. Scatter Button
        const scatterBtn = document.createElement('div');
        scatterBtn.className = 'scatter-btn';
        scatterBtn.textContent = '×';
        clip.appendChild(scatterBtn);

        // 5. Stack Interactions
        let isDraggingStack = false;
        let startX, startY, initialPartOffsets = [];

        clip.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (e.button !== 0) return;
            isDraggingStack = true;
            startX = e.clientX;
            startY = e.clientY;
            initialPartOffsets = pieces.map(p => ({
                el: p,
                left: parseFloat(p.style.left) || 0,
                top: parseFloat(p.style.top) || 0
            }));
            const clipLeft = parseFloat(clip.style.left) || 0;
            const clipTop = parseFloat(clip.style.top) || 0;
            clip._initialLeft = clipLeft;
            clip._initialTop = clipTop;
            clip.setPointerCapture(e.pointerId);
        });

        clip.addEventListener('pointermove', (e) => {
            if (!isDraggingStack) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            initialPartOffsets.forEach(po => {
                po.el.style.left = `${po.left + dx}px`;
                po.el.style.top = `${po.top + dy}px`;
            });
            clip.style.left = `${clip._initialLeft + dx}px`;
            clip.style.top = `${clip._initialTop + dy}px`;
        });

        clip.addEventListener('pointerup', (e) => {
            isDraggingStack = false;
            clip.releasePointerCapture(e.pointerId);
        });

        // Flip Through: Clicking the stack cycles the top element to the back
        clip.addEventListener('click', (e) => {
            if (e.target === scatterBtn) {
                // Handle Scatter separately
                scatter();
                return;
            }
            
            // Cycle Z-Indices
            let maxZ = 0;
            let minZ = 10000;
            pieces.forEach(p => {
                const z = parseInt(p.style.zIndex);
                if (z > maxZ) maxZ = z;
                if (z < minZ) minZ = z;
            });

            pieces.forEach(p => {
                let z = parseInt(p.style.zIndex);
                if (z === maxZ) {
                    p.style.zIndex = minZ; // Send top to bottom
                } else {
                    p.style.zIndex = z + 1; // Bring others up
                }
            });
        });

        function scatter() {
            pieces.forEach(p => {
                const ox = (Math.random() - 0.5) * 200;
                const oy = (Math.random() - 0.5) * 200;
                const curX = parseFloat(p.style.left) || 0;
                const curY = parseFloat(p.style.top) || 0;
                p.style.transition = 'left 0.5s ease-out, top 0.5s ease-out';
                p.style.left = `${curX + ox}px`;
                p.style.top = `${curY + oy}px`;
                setTimeout(() => p.style.transition = '', 500);
            });
            clip.remove();
        }
    }
});
