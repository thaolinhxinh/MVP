/**
 * Main Application Logic & Controller
 * Manages tab switching, theme toggles, wireframe hotspots, and live AR adjustments.
 */

document.addEventListener('DOMContentLoaded', () => {
    let viewer = null; // Three.js viewer instance
    let stream = null; // Webcam stream reference

    // --- DOM Elements ---
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 1. Light/Dark Theme Switcher ---
    themeToggleBtn.addEventListener('click', () => {
        if (body.classList.contains('light-theme')) {
            body.classList.replace('light-theme', 'dark-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            body.classList.replace('dark-theme', 'light-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });

    // --- 2. Tab Switching Engine ---
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Toggle tabs styling
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle panels visibility
            tabPanels.forEach(panel => {
                if (panel.id === `tab-${targetTab}`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Initialize Three.js on first access to Live Experiment
            if (targetTab === 'live-experiment') {
                if (!viewer) {
                    // Show a quick loading state or initialize directly
                    viewer = new Refrigerator3DViewer('threejs-canvas-container');
                    // Setup default background preset
                    const bgOverlay = document.getElementById('kitchen-bg-overlay');
                    bgOverlay.className = 'kitchen-bg-image kitchen-modern-bg';
                } else {
                    // Resize to avoid stretching
                    viewer.onWindowResize();
                }
            } else {
                // If switching back to wireframe, turn off webcam to save energy
                stopWebcam();
            }
        });
    });

    // --- 3. Clickable Wireframe Prototype Engine ---
    const hotspots = document.querySelectorAll('.hotspot');
    const wireframePageItems = document.querySelectorAll('.wireframe-page-item');
    const screenContents = document.querySelectorAll('.screen-content');
    const annotationCards = document.querySelectorAll('.annotation-card');
    const toggleHotspotsBtn = document.getElementById('toggle-hotspots');
    const deviceWrapper = document.querySelector('.device-wrapper');

    let hotspotsVisible = true;

    // Toggle Hotspots Visibility button
    toggleHotspotsBtn.addEventListener('click', () => {
        hotspotsVisible = !hotspotsVisible;
        if (hotspotsVisible) {
            deviceWrapper.classList.remove('hotspots-hidden');
            toggleHotspotsBtn.innerHTML = '<i class="fa-solid fa-eye"></i> Hiện Hotspots';
        } else {
            deviceWrapper.classList.add('hotspots-hidden');
            toggleHotspotsBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ẩn Hotspots';
        }
    });

    // Handle hotspot clicks
    hotspots.forEach(hotspot => {
        hotspot.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent bubbles
            const targetScreen = hotspot.getAttribute('data-target');
            navigateToScreen(targetScreen);
        });
    });

    // Handle page browser click inside Figma sidebar
    wireframePageItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreen = item.getAttribute('data-screen');
            navigateToScreen(targetScreen);
        });
    });

    // Navigation function inside Figma Prototype
    function navigateToScreen(screenId) {
        if (!screenId) return;

        // 1. Update screen visibility
        screenContents.forEach(screen => {
            if (screen.id === `screen-${screenId}`) {
                screen.classList.add('active');
            } else {
                screen.classList.remove('active');
            }
        });

        // 2. Update navigation item highlight
        wireframePageItems.forEach(item => {
            if (item.getAttribute('data-screen') === screenId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // 3. Update UX Annotation block
        annotationCards.forEach(card => {
            if (card.id === `note-${screenId}`) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // --- 4. Live 3D Experiment Interactive Controls ---
    const doorOpenSlider = document.getElementById('door-open-slider');
    const doorAngleText = document.getElementById('door-angle-text');
    const btnQuickClose = document.getElementById('btn-quick-close');
    const btnQuickOpen = document.getElementById('btn-quick-open');
    const colorButtons = document.querySelectorAll('.color-btn');
    const toggleDimensionsCheckbox = document.getElementById('toggle-3d-dimensions');
    const btnResetView = document.getElementById('btn-reset-view');

    // Door sliders
    doorOpenSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        doorAngleText.textContent = value === 0 ? 'Đang đóng (0%)' : `Mở cửa: ${value}%`;
        
        if (viewer) {
            viewer.setDoorOpen(value / 100);
        }

        // Toggle active states on quick buttons
        if (value === 0) {
            btnQuickClose.classList.add('active');
            btnQuickOpen.classList.remove('active');
        } else if (value === 100) {
            btnQuickOpen.classList.add('active');
            btnQuickClose.classList.remove('active');
        } else {
            btnQuickOpen.classList.remove('active');
            btnQuickClose.classList.remove('active');
        }
    });

    // Quick open/close
    btnQuickClose.addEventListener('click', () => {
        doorOpenSlider.value = 0;
        doorAngleText.textContent = 'Đang đóng (0%)';
        btnQuickClose.classList.add('active');
        btnQuickOpen.classList.remove('active');
        if (viewer) viewer.setDoorOpen(0);
    });

    btnQuickOpen.addEventListener('click', () => {
        doorOpenSlider.value = 100;
        doorAngleText.textContent = 'Mở cửa: 100%';
        btnQuickOpen.classList.add('active');
        btnQuickClose.classList.remove('active');
        if (viewer) viewer.setDoorOpen(1);
    });

    // Color Swapping
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const selectedColor = btn.getAttribute('data-color');
            if (viewer) {
                viewer.setStyle(selectedColor);
            }
        });
    });

    // Dimensions display
    toggleDimensionsCheckbox.addEventListener('change', (e) => {
        if (viewer) {
            viewer.setDimensionsVisible(e.target.checked);
        }
    });

    // Reset View
    btnResetView.addEventListener('click', () => {
        if (viewer) viewer.resetView();
    });


    // --- 5. AR Mode Placement & Webcam controls ---
    const toggleARModeCheckbox = document.getElementById('toggle-ar-mode');
    const arCameraSettings = document.getElementById('ar-camera-settings');
    const bgSourceButtons = document.querySelectorAll('.bg-source-btn');
    const kitchenBgOverlay = document.getElementById('kitchen-bg-overlay');
    const webcamFeedVideo = document.getElementById('webcam-feed');
    const arHudOverlay = document.getElementById('ar-hud-overlay');

    // Sliders
    const arRotateSlider = document.getElementById('ar-rotate-slider');
    const arRotateVal = document.getElementById('ar-rotate-val');
    const arScaleSlider = document.getElementById('ar-scale-slider');
    const arScaleVal = document.getElementById('ar-scale-val');
    const arHeightSlider = document.getElementById('ar-height-slider');
    const arHeightVal = document.getElementById('ar-height-val');

    // Toggle AR simulation
    toggleARModeCheckbox.addEventListener('change', (e) => {
        const active = e.target.checked;
        
        if (active) {
            arCameraSettings.classList.remove('disabled-group');
            arHudOverlay.classList.remove('hidden');
            
            // Set AR state in 3D viewer
            if (viewer) {
                viewer.setARMode(true);
            }

            // Render active background source
            activateBgSource(document.querySelector('.bg-source-btn.active'));
        } else {
            arCameraSettings.classList.add('disabled-group');
            arHudOverlay.classList.add('hidden');
            
            // Turn off camera/webcam stream
            stopWebcam();
            kitchenBgOverlay.style.opacity = 0;
            webcamFeedVideo.classList.add('hidden');

            // Reset 3D viewer positions
            if (viewer) {
                viewer.setARMode(false);
            }

            // Reset AR adjustment sliders
            resetARSliders();
        }
    });

    // Setup background source selector buttons
    bgSourceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            bgSourceButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (toggleARModeCheckbox.checked) {
                activateBgSource(btn);
            }
        });
    });

    function activateBgSource(btnElement) {
        if (!btnElement) return;

        const source = btnElement.getAttribute('data-source');
        
        if (source === 'kitchen-modern') {
            stopWebcam();
            webcamFeedVideo.classList.add('hidden');
            kitchenBgOverlay.className = 'kitchen-bg-image kitchen-modern-bg';
            kitchenBgOverlay.style.opacity = 1;
        } else if (source === 'kitchen-classic') {
            stopWebcam();
            webcamFeedVideo.classList.add('hidden');
            kitchenBgOverlay.className = 'kitchen-bg-image kitchen-classic-bg';
            kitchenBgOverlay.style.opacity = 1;
        } else if (btnElement.id === 'btn-use-webcam') {
            kitchenBgOverlay.style.opacity = 0;
            startWebcam();
        }
    }

    // Start Webcam
    function startWebcam() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(mediaStream => {
                    stream = mediaStream;
                    webcamFeedVideo.srcObject = mediaStream;
                    webcamFeedVideo.classList.remove('hidden');
                })
                .catch(err => {
                    console.error('Camera access denied:', err);
                    alert('Không thể truy cập camera. Hệ thống sẽ sử dụng hình nền giả lập bếp thay thế.');
                    // fallback to modern kitchen
                    const fallbackBtn = document.querySelector('[data-source="kitchen-modern"]');
                    fallbackBtn.click();
                });
        } else {
            alert('Trình duyệt của bạn không hỗ trợ truy cập camera.');
        }
    }

    // Stop Webcam
    function stopWebcam() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            webcamFeedVideo.srcObject = null;
        }
    }

    // AR Rotation Slider
    arRotateSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        arRotateVal.textContent = `${val}°`;
        if (viewer && viewer.arModeActive) {
            // Convert to radians (0 to 360 deg)
            viewer.fridgeGroup.rotation.y = (val * Math.PI) / 180;
        }
    });

    // AR Scale Slider
    arScaleSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        arScaleVal.textContent = `${val}%`;
        if (viewer && viewer.arModeActive) {
            // Scale multiplier (0.5 to 1.5)
            const scaleFactor = val / 100;
            viewer.fridgeGroup.scale.setScalar(scaleFactor);
        }
    });

    // AR Vertical Height Adjustment
    arHeightSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        arHeightVal.textContent = `${val} cm`;
        if (viewer && viewer.arModeActive) {
            // Move in Y axis (-1.0 to 1.0 meters)
            viewer.fridgeGroup.position.y = val / 100;
        }
    });

    function resetARSliders() {
        arRotateSlider.value = 0;
        arRotateVal.textContent = '0°';
        arScaleSlider.value = 100;
        arScaleVal.textContent = '100%';
        arHeightSlider.value = 0;
        arHeightVal.textContent = '0 cm';
    }


    // --- 6. Kitchen Space Fit Checker (Size Fit Check) ---
    const btnCheckFit = document.getElementById('btn-check-fit');
    const inputKitchenW = document.getElementById('kitchen-w');
    const inputKitchenH = document.getElementById('kitchen-h');
    const inputKitchenD = document.getElementById('kitchen-d');

    const fitResultCard = document.getElementById('fit-result-card');
    const fitIcon = document.getElementById('fit-icon');
    const fitTitle = document.getElementById('fit-title');
    const fitMessage = document.getElementById('fit-message');
    
    const fitDetailsDiv = document.getElementById('fit-details');
    const fitWVal = document.getElementById('fit-w-val');
    const fitHVal = document.getElementById('fit-h-val');
    const fitDVal = document.getElementById('fit-d-val');

    // Fridge dimensions in cm
    const fridgeW = 91.2;
    const fridgeH = 185.3;
    const fridgeD = 67.3;

    btnCheckFit.addEventListener('click', () => {
        const wVal = parseFloat(inputKitchenW.value);
        const hVal = parseFloat(inputKitchenH.value);
        const dVal = parseFloat(inputKitchenD.value);

        if (isNaN(wVal) || isNaN(hVal) || isNaN(dVal)) {
            alert('Vui lòng điền đầy đủ và chính xác các thông số kích thước hốc tủ bếp.');
            return;
        }

        // Calculate clearances
        const clearanceW = wVal - fridgeW;
        const clearanceH = hVal - fridgeH;
        const clearanceD = dVal - fridgeD;

        // Render detailed clearances (2 decimal places)
        fitWVal.textContent = `${clearanceW.toFixed(1)} cm`;
        fitHVal.textContent = `${clearanceH.toFixed(1)} cm`;
        fitDVal.textContent = `${clearanceD.toFixed(1)} cm`;
        fitDetailsDiv.classList.remove('hidden');

        // Reset classes
        fitResultCard.className = 'fit-result-card';

        // FITTING LOGIC
        if (clearanceW < 0 || clearanceH < 0 || clearanceD < 0) {
            // RED: Refrigerator does not fit physically
            fitResultCard.classList.add('fit-error-card');
            fitIcon.className = 'fa-solid fa-circle-xmark';
            fitTitle.textContent = 'KHÔNG VỪA KÍCH THƯỚC';
            
            let issues = [];
            if (clearanceW < 0) issues.push(`Chiều rộng tủ bếp thiếu ${Math.abs(clearanceW).toFixed(1)} cm`);
            if (clearanceH < 0) issues.push(`Chiều cao tủ bếp thiếu ${Math.abs(clearanceH).toFixed(1)} cm`);
            if (clearanceD < 0) issues.push(`Chiều sâu tủ bếp thiếu ${Math.abs(clearanceD).toFixed(1)} cm`);

            fitMessage.innerHTML = `Tủ lạnh <b>không thể xếp vừa</b> hốc tủ bếp hiện tại của bạn.<br>Chi tiết lỗi: <b>${issues.join(', ')}</b>. Vui lòng cơi nới hốc bếp hoặc chọn dòng tủ lạnh nhỏ hơn.`;
        } 
        else if (clearanceW < 10.0 || clearanceH < 5.0 || clearanceD < 5.0) {
            // YELLOW: Fits physically, but violates the 5cm recommended safety clearance on sides/top/back
            // Note: Side clearance is split left + right, so we want at least 5cm each side, which means total width clearance should be >= 10cm.
            fitResultCard.classList.add('fit-warning-card');
            fitIcon.className = 'fa-solid fa-circle-exclamation';
            fitTitle.textContent = 'VỪA NHƯNG KHE HỞ QUÁ HẸP';

            let recommendations = [];
            if (clearanceW < 10.0) recommendations.push(`Khe hở hai bên chỉ còn ${(clearanceW / 2).toFixed(1)} cm (nhỏ hơn mức khuyến nghị 5.0 cm mỗi bên)`);
            if (clearanceH < 5.0) recommendations.push(`Khe hở bên trên chỉ còn ${clearanceH.toFixed(1)} cm (khuyến nghị 5.0 cm)`);
            if (clearanceD < 5.0) recommendations.push(`Khe hở phía sau chỉ còn ${clearanceD.toFixed(1)} cm (khuyến nghị 5.0 cm)`);

            fitMessage.innerHTML = `Tủ lạnh xếp vừa hốc tủ, tuy nhiên <b>chưa đạt yêu cầu thoát nhiệt an toàn</b>.<br>Cảnh báo: <b>${recommendations.join(', và ')}</b>. Khoang quá kín sẽ làm tủ hoạt động nóng hơn, tốn điện và làm giảm tuổi thọ máy nén.`;
        } 
        else {
            // GREEN: Perfect fit with ventilation safety margins
            fitResultCard.classList.add('fit-success-card');
            fitIcon.className = 'fa-solid fa-circle-check';
            fitTitle.textContent = 'VỪA VẶN HOÀN HẢO';
            fitMessage.innerHTML = `Tuyệt vời! Kích thước hốc tủ bếp <b>hoàn toàn phù hợp</b> để lắp đặt mẫu tủ lạnh này. Các khe hở hai bên (${(clearanceW/2).toFixed(1)} cm mỗi bên), đỉnh tủ (${clearanceH.toFixed(1)} cm) và phía sau (${clearanceD.toFixed(1)} cm) đều đảm bảo khoảng trống thoát nhiệt tuyệt đối, giúp máy chạy êm và bền bỉ.`;
        }
    });
});
