/**
 * Brew Focus - Main Application
 * Handles UI interactions, animations, and user experience
 */

(function() {
    'use strict';

    // DOM Elements
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        // Timer display
        minutes: $('#minutes'),
        seconds: $('#seconds'),
        timerLabel: $('#timerLabel'),
        mugWrapper: $('.mug-wrapper'),
        
        // Coffee visualization (pixel version)
        coffeeFill: $('#coffeeFill'),
        coffeeSurface: $('#coffeeSurface'),
        steamContainer: $('#steamContainer'),
        
        // Progress
        progressBar: $('#progressBar'),
        progressText: $('#progressText'),
        
        // Controls
        playBtn: $('#playBtn'),
        resetBtn: $('#resetBtn'),
        skipBtn: $('#skipBtn'),
        playIcon: $('.play-icon'),
        pauseIcon: $('.pause-icon'),
        
        // Presets
        presetBtns: $$('.preset-btn'),
        
        // Custom time
        customTime: $('.custom-time'),
        customToggle: $('#customToggle'),
        customContent: $('#customContent'),
        customMin: $('#customMin'),
        customSec: $('#customSec'),
        applyCustom: $('#applyCustom'),
        
        // Stats
        sessionsCount: $('#sessionsCount'),
        focusTime: $('#focusTime'),
        streak: $('#streak'),
        
        // Settings
        settingsBtn: $('#settingsBtn'),
        modalOverlay: $('#modalOverlay'),
        closeModal: $('#closeModal'),
        soundToggle: $('#soundToggle'),
        notifToggle: $('#notifToggle'),
        resetStats: $('#resetStats'),
        
        // Toast
        toast: $('#toast'),
        toastMessage: $('#toastMessage')
    };

    // Settings
    const settings = {
        sound: localStorage.getItem('brewfocus_sound') !== 'false',
        notifications: localStorage.getItem('brewfocus_notif') !== 'false'
    };

    // Pixel coffee config - adjusted for pixel art mug
    const coffeeConfig = {
        minY: 48,      // Top of coffee (surface)
        maxY: 176,     // Bottom of mug interior
        fullHeight: 120 // Full coffee height
    };

    // Progress ring config
    const circumference = 2 * Math.PI * 54;

    // Initialize timer
    const timer = new Timer({
        duration: 25 * 60,
        
        onTick: (remaining, total) => {
            updateDisplay(remaining);
            updateCoffee(remaining, total);
            updateProgress(remaining, total);
        },
        
        onComplete: (stats) => {
            handleComplete(stats);
        },
        
        onStateChange: (state) => {
            handleStateChange(state);
        }
    });

    // ===== Display Updates =====
    
    function updateDisplay(remaining) {
        const time = Timer.formatTime(remaining);
        els.minutes.textContent = time.minutes;
        els.seconds.textContent = time.seconds;
        document.title = `${time.display} - Brew Focus`;
    }

    function updateCoffee(remaining, total) {
        const fill = remaining / total; // 1 = full, 0 = empty
        
        // Calculate new height and position for pixel coffee
        const newHeight = Math.max(0, coffeeConfig.fullHeight * fill);
        const newY = coffeeConfig.minY + 8 + (coffeeConfig.fullHeight - newHeight);
        const surfaceY = newY - 8;
        
        // Update coffee fill rectangle
        els.coffeeFill.setAttribute('y', newY);
        els.coffeeFill.setAttribute('height', newHeight);
        
        // Update coffee surface position
        els.coffeeSurface.setAttribute('y', surfaceY);
        
        // Hide surface when nearly empty
        els.coffeeSurface.style.opacity = fill < 0.08 ? 0 : 1;
    }

    function updateProgress(remaining, total) {
        const progress = remaining / total;
        const offset = circumference * (1 - progress);
        els.progressBar.style.strokeDashoffset = offset;
        els.progressText.textContent = `${Math.round(progress * 100)}%`;
    }

    function updateStats(stats) {
        els.sessionsCount.textContent = stats.sessions;
        els.focusTime.textContent = Timer.formatDuration(stats.totalTime);
        els.streak.textContent = stats.streak;
    }

    // ===== State Handling =====
    
    function handleStateChange(state) {
        els.mugWrapper.classList.remove('running', 'paused', 'celebrate');
        
        switch (state) {
            case 'running':
                els.mugWrapper.classList.add('running');
                els.playIcon.classList.add('hidden');
                els.pauseIcon.classList.remove('hidden');
                els.steamContainer.classList.add('active');
                els.timerLabel.textContent = 'FOCUS!';
                setPresetsEnabled(false);
                setCustomEnabled(false);
                break;
                
            case 'paused':
                els.mugWrapper.classList.add('paused');
                els.playIcon.classList.remove('hidden');
                els.pauseIcon.classList.add('hidden');
                els.steamContainer.classList.remove('active');
                els.timerLabel.textContent = 'PAUSED';
                break;
                
            case 'reset':
                els.playIcon.classList.remove('hidden');
                els.pauseIcon.classList.add('hidden');
                els.steamContainer.classList.remove('active');
                els.timerLabel.textContent = 'READY!';
                document.title = 'Brew Focus - Pomodoro Timer';
                setPresetsEnabled(true);
                setCustomEnabled(true);
                break;
                
            case 'complete':
                els.mugWrapper.classList.add('celebrate');
                els.playIcon.classList.remove('hidden');
                els.pauseIcon.classList.add('hidden');
                els.steamContainer.classList.remove('active');
                els.timerLabel.textContent = 'NICE! 🎉';
                setPresetsEnabled(true);
                setCustomEnabled(true);
                break;
        }
    }

    function handleComplete(stats) {
        updateStats(stats);
        
        if (settings.sound) {
            playSound();
        }
        
        if (settings.notifications) {
            showNotification();
        }
        
        // Reset after celebration
        setTimeout(() => {
            timer.reset();
        }, 2500);
    }

    // ===== Audio =====
    
    function playSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // 8-bit style sound!
            const playNote = (freq, start, dur) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square'; // 8-bit square wave!
                osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + dur);
            };
            
            // Victory jingle - 8-bit style!
            playNote(523, 0, 0.15);
            playNote(659, 0.15, 0.15);
            playNote(784, 0.3, 0.15);
            playNote(1047, 0.45, 0.3);
        } catch (e) {
            console.warn('Audio not supported');
        }
    }

    function showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Brew Focus', {
                body: 'Level complete! Great focus session! ☕',
                icon: 'assets/favicon.svg'
            });
        }
    }

    // ===== UI Helpers =====
    
    function setPresetsEnabled(enabled) {
        els.presetBtns.forEach(btn => {
            btn.style.pointerEvents = enabled ? 'auto' : 'none';
            btn.style.opacity = enabled ? '1' : '0.4';
        });
    }

    function setCustomEnabled(enabled) {
        els.customMin.disabled = !enabled;
        els.customSec.disabled = !enabled;
        els.applyCustom.disabled = !enabled;
        els.applyCustom.style.opacity = enabled ? '1' : '0.4';
    }

    function setActivePreset(seconds) {
        els.presetBtns.forEach(btn => {
            const time = parseInt(btn.dataset.time);
            btn.classList.toggle('active', time === seconds);
        });
    }

    function showToast(message) {
        els.toastMessage.textContent = message;
        els.toast.classList.add('show');
        setTimeout(() => els.toast.classList.remove('show'), 2500);
    }

    function validateInput(input, min, max) {
        let val = parseInt(input.value) || 0;
        val = Math.max(min, Math.min(max, val));
        input.value = val.toString().padStart(2, '0');
        return val;
    }

    // ===== Event Listeners =====
    
    // Play/Pause
    els.playBtn.addEventListener('click', () => {
        timer.toggle();
    });

    // Reset
    els.resetBtn.addEventListener('click', () => {
        timer.reset();
        showToast('Timer reset');
    });

    // Skip
    els.skipBtn.addEventListener('click', () => {
        if (timer.isRunning) {
            timer.skip();
        }
    });

    // Presets
    els.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const seconds = parseInt(btn.dataset.time);
            timer.setDuration(seconds);
            setActivePreset(seconds);
            
            // Update custom inputs
            els.customMin.value = Math.floor(seconds / 60).toString().padStart(2, '0');
            els.customSec.value = (seconds % 60).toString().padStart(2, '0');
            
            showToast(`Timer set to ${Math.floor(seconds / 60)} minutes`);
        });
    });

    // Custom time toggle
    els.customToggle.addEventListener('click', () => {
        els.customTime.classList.toggle('open');
    });

    // Apply custom time
    els.applyCustom.addEventListener('click', () => {
        const mins = validateInput(els.customMin, 0, 180);
        const secs = validateInput(els.customSec, 0, 59);
        const total = (mins * 60) + secs;
        
        if (total > 0) {
            timer.setDuration(total);
            setActivePreset(total);
            showToast(`Timer set to ${mins}m ${secs}s`);
        }
    });

    // Input validation
    els.customMin.addEventListener('blur', () => validateInput(els.customMin, 0, 180));
    els.customSec.addEventListener('blur', () => validateInput(els.customSec, 0, 59));

    // Enter key on inputs
    [els.customMin, els.customSec].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') els.applyCustom.click();
        });
    });

    // Settings modal
    els.settingsBtn.addEventListener('click', () => {
        els.modalOverlay.classList.add('open');
    });

    els.closeModal.addEventListener('click', () => {
        els.modalOverlay.classList.remove('open');
    });

    els.modalOverlay.addEventListener('click', (e) => {
        if (e.target === els.modalOverlay) {
            els.modalOverlay.classList.remove('open');
        }
    });

    // Sound toggle
    els.soundToggle.checked = settings.sound;
    els.soundToggle.addEventListener('change', () => {
        settings.sound = els.soundToggle.checked;
        localStorage.setItem('brewfocus_sound', settings.sound);
    });

    // Notifications toggle
    els.notifToggle.checked = settings.notifications;
    els.notifToggle.addEventListener('change', () => {
        settings.notifications = els.notifToggle.checked;
        localStorage.setItem('brewfocus_notif', settings.notifications);
        
        if (settings.notifications && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    });

    // Reset stats
    els.resetStats.addEventListener('click', () => {
        if (confirm('Reset all statistics?')) {
            const stats = timer.resetStats();
            updateStats(stats);
            showToast('Statistics reset');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                timer.toggle();
                break;
            case 'KeyR':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    timer.reset();
                    showToast('Timer reset');
                }
                break;
            case 'Escape':
                els.modalOverlay.classList.remove('open');
                break;
            case 'Digit1':
            case 'Numpad1':
                if (!timer.isRunning) $('[data-time="300"]').click();
                break;
            case 'Digit2':
            case 'Numpad2':
                if (!timer.isRunning) $('[data-time="600"]').click();
                break;
            case 'Digit3':
            case 'Numpad3':
                if (!timer.isRunning) $('[data-time="1500"]').click();
                break;
            case 'Digit4':
            case 'Numpad4':
                if (!timer.isRunning) $('[data-time="3000"]').click();
                break;
        }
    });

    // ===== Initialize =====
    
    function init() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default' && settings.notifications) {
            Notification.requestPermission();
        }
        
        // Initial display
        const state = timer.getState();
        updateDisplay(state.remainingTime);
        updateCoffee(state.remainingTime, state.duration);
        updateProgress(state.remainingTime, state.duration);
        updateStats(timer.getStats());
        setActivePreset(state.duration);
        
        // Set custom inputs
        els.customMin.value = Math.floor(state.duration / 60).toString().padStart(2, '0');
        els.customSec.value = (state.duration % 60).toString().padStart(2, '0');
        
        console.log('☕ Brew Focus ready!');
        console.log('Shortcuts: Space (play/pause), R (reset), 1-4 (presets)');
    }

    init();
})();
