/**
 * Timer Class - Core Backend Logic
 * Handles timer state, time calculations, persistence, and events
 */

class Timer {
    constructor(options = {}) {
        this.duration = options.duration || 25 * 60;
        this.remainingTime = this.duration;
        this.isRunning = false;
        this.isPaused = false;
        this.intervalId = null;
        this.startTimestamp = null;
        this.pausedAt = null;
        
        // Callbacks
        this.onTick = options.onTick || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onStateChange = options.onStateChange || (() => {});
        
        // Stats
        this.stats = this.loadStats();
        this.checkDayReset();
    }
    
    start() {
        if (this.isRunning && !this.isPaused) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTimestamp = Date.now() - ((this.duration - this.remainingTime) * 1000);
        
        this.intervalId = setInterval(() => this.tick(), 50);
        this.onStateChange('running');
    }
    
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        this.pausedAt = Date.now();
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.onStateChange('paused');
    }
    
    resume() {
        if (!this.isPaused) return;
        this.start();
    }
    
    toggle() {
        if (!this.isRunning) {
            this.start();
        } else if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
    
    reset(newDuration = null) {
        this.stop();
        if (newDuration !== null) {
            this.duration = Math.max(1, Math.min(newDuration, 10800));
        }
        this.remainingTime = this.duration;
        this.startTimestamp = null;
        this.pausedAt = null;
        this.onTick(this.remainingTime, this.duration);
        this.onStateChange('reset');
    }
    
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    skip() {
        this.complete();
    }
    
    setDuration(seconds) {
        const wasRunning = this.isRunning;
        this.reset(seconds);
        if (wasRunning) {
            // Optionally auto-start, but usually we don't
        }
    }
    
    tick() {
        const elapsed = (Date.now() - this.startTimestamp) / 1000;
        this.remainingTime = Math.max(0, this.duration - elapsed);
        this.onTick(this.remainingTime, this.duration);
        
        if (this.remainingTime <= 0) {
            this.complete();
        }
    }
    
    complete() {
        this.stop();
        this.remainingTime = 0;
        
        // Update stats
        this.stats.sessions++;
        this.stats.totalTime += this.duration;
        this.updateStreak();
        this.saveStats();
        
        this.onComplete(this.stats);
        this.onStateChange('complete');
    }
    
    // Stats Management
    loadStats() {
        try {
            const saved = localStorage.getItem('brewfocus_stats');
            return saved ? JSON.parse(saved) : {
                sessions: 0,
                totalTime: 0,
                streak: 0,
                lastDate: null,
                date: new Date().toDateString()
            };
        } catch (e) {
            return { sessions: 0, totalTime: 0, streak: 0, lastDate: null, date: new Date().toDateString() };
        }
    }
    
    saveStats() {
        try {
            this.stats.lastDate = new Date().toDateString();
            localStorage.setItem('brewfocus_stats', JSON.stringify(this.stats));
        } catch (e) {
            console.warn('Could not save stats');
        }
    }
    
    checkDayReset() {
        const today = new Date().toDateString();
        if (this.stats.date !== today) {
            // Check if yesterday for streak
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (this.stats.lastDate !== yesterday && this.stats.lastDate !== today) {
                this.stats.streak = 0;
            }
            // Reset daily stats
            this.stats.sessions = 0;
            this.stats.totalTime = 0;
            this.stats.date = today;
            this.saveStats();
        }
    }
    
    updateStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (this.stats.lastDate === today) {
            return; // Already counted today
        } else if (this.stats.lastDate === yesterday || !this.stats.lastDate) {
            this.stats.streak++;
        } else {
            this.stats.streak = 1;
        }
    }
    
    resetStats() {
        this.stats = { sessions: 0, totalTime: 0, streak: 0, lastDate: null, date: new Date().toDateString() };
        this.saveStats();
        return this.stats;
    }
    
    getStats() {
        return { ...this.stats };
    }
    
    getProgress() {
        if (this.duration === 0) return 100;
        return (this.remainingTime / this.duration) * 100;
    }
    
    getFillLevel() {
        return this.duration > 0 ? this.remainingTime / this.duration : 1;
    }
    
    getState() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            remainingTime: this.remainingTime,
            duration: this.duration
        };
    }
    
    static formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return {
            minutes: m.toString().padStart(2, '0'),
            seconds: s.toString().padStart(2, '0'),
            display: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        };
    }
    
    static formatDuration(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timer;
}
