import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Brew } from '../core/brew';
import { AmbienceMixer } from './ambience-mixer';
import { ModePicker } from './mode-picker';
import { TaskList } from './task-list';
import { TimerStage } from './timer-stage';

@Component({
  selector: 'app-brew-page',
  imports: [TimerStage, TaskList, ModePicker, AmbienceMixer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-timer-stage class="stage" />
    <app-task-list class="tasks" />
    <div class="side">
      <app-mode-picker />
      <app-ambience-mixer />
    </div>
  `,
  styles: `
    /* The stage comes first in the DOM (and on phones); grid areas place the panels. */
    :host {
      display: grid;
      gap: 28px;
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'stage' 'tasks' 'side';
    }
    .stage { grid-area: stage; }
    .tasks { grid-area: tasks; }
    .side { grid-area: side; display: grid; gap: 28px; align-content: start; }

    @media (min-width: 760px) {
      :host {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-areas: 'stage stage' 'tasks side';
        align-items: start;
      }
    }
    @media (min-width: 1120px) {
      :host {
        grid-template-columns: 300px minmax(0, 1fr) 300px;
        grid-template-areas: 'tasks stage side';
      }
    }
  `,
  host: { '(window:keydown)': 'brew.onKey($event)' },
})
export class BrewPage {
  protected readonly brew = inject(Brew);
}
