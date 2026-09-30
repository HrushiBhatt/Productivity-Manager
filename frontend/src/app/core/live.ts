import { Injectable, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { LiveEvent } from './models';

const EVENT_TYPES: LiveEvent['type'][] = [
  'timer',
  'session.completed',
  'session.discarded',
  'break.completed',
  'session.reflected',
  'changed',
];

/**
 * The server's live stream (Server-Sent Events). Every tab and device signed in to
 * the same account receives the same events, which keeps them in sync. EventSource
 * reconnects on its own, and the server opens each connection with a fresh snapshot.
 * In the GitHub Pages build the same events come from the in-browser backend instead.
 */
@Injectable({ providedIn: 'root' })
export class LiveEvents {
  private source?: EventSource;
  private localEvents?: Subscription;
  private readonly subject = new Subject<LiveEvent>();
  private readonly localStream = environment.localEvents?.(); // the Pages build's in-browser backend

  readonly events$ = this.subject.asObservable();
  readonly connected = signal(false);
  /** True when the backend runs in this browser (the GitHub Pages build). */
  readonly isLocal = environment.browserBackend;

  connect(): void {
    if (this.localStream) {
      this.localEvents ??= this.localStream.subscribe((e) => this.subject.next(e));
      this.connected.set(true);
      return;
    }
    if (this.source) return;
    const source = new EventSource('/api/events'); // same origin, so the login cookie goes along
    for (const type of EVENT_TYPES) {
      source.addEventListener(type, (e) =>
        this.subject.next({ type, data: JSON.parse((e as MessageEvent<string>).data) } as LiveEvent),
      );
    }
    source.onopen = () => this.connected.set(true);
    source.onerror = () => this.connected.set(source.readyState === EventSource.OPEN);
    this.source = source;
  }

  disconnect(): void {
    this.localEvents?.unsubscribe();
    this.localEvents = undefined;
    this.source?.close();
    this.source = undefined;
    this.connected.set(false);
  }
}
