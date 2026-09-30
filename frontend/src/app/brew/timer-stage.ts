import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Brew } from '../core/brew';
import { ICONS } from '../core/sprites';
import { formatClock } from '../core/time';
import { PixelMug } from '../shared/pixel-mug';
import { MinutesPipe, PluralPipe } from '../shared/pipes';
import { Sprite } from '../shared/sprite';

const SEGMENTS = 24;

@Component({
  selector: 'app-timer-stage',
  imports: [PixelMug, Sprite, MinutesPipe, PluralPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timer-stage.html',
  styleUrl: './timer-stage.css',
})
export class TimerStage {
  protected readonly brew = inject(Brew);
  protected readonly icons = ICONS;
  protected readonly segments = Array.from({ length: SEGMENTS }, (_, i) => i);

  protected readonly status = computed(() => this.brew.timer.state().status);
  protected readonly onBreak = computed(() => this.brew.phase() === 'break');
  protected readonly lit = computed(() => Math.round(this.brew.progress() * SEGMENTS));
  protected readonly clock = computed(() => formatClock(this.brew.display().remainingMs / 1000).split(':'));

  protected readonly label = computed(() => {
    if (this.brew.reflecting()) return 'NICE!';
    if (this.status() === 'paused') return 'PAUSED';
    if (this.onBreak()) return 'BREAK';
    return this.status() === 'running' ? 'FOCUS!' : 'READY!';
  });

  /** The running block's mode (possibly started on another device), else the selected one. */
  protected readonly modeLabel = computed(() => {
    const running = this.brew.timer.state().mode;
    const m = this.brew.mode();
    return running ?? `${m.name} · ${m.focus}/${m.rest}`;
  });

  protected readonly caption = computed(() => {
    if (this.onBreak()) return 'Step away from the screen. Stretch, sip, breathe.';
    if (this.brew.intention()) return `🎯 ${this.brew.intention()}`;
    const task = this.brew.tasks().find((t) => t.id === this.brew.taskId());
    return task ? `Up next: ${task.title}` : 'Press start to set an intention for this brew.';
  });
}
