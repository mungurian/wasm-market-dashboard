import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('web');
  protected readonly wasmPoc = signal('loading wasm worker...');

  constructor() {
    if (typeof Worker === 'undefined') {
      this.wasmPoc.set('no Worker support (test environment)');
      return;
    }
    const worker = new Worker(new URL('./worker/producer.worker', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event) => {
      this.wasmPoc.set(JSON.stringify(event.data));
      worker.terminate();
    };
  }
}
