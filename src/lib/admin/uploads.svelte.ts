import type { MediaItem } from '#lib/types.js';
import { errorText, uploadImage } from './api.js';

/** Uploads several photos one at a time and tracks progress for the UI. */
export class UploadQueue {
	total = $state(0);
	done = $state(0);
	errors = $state<string[]>([]);
	busy = $derived(this.done < this.total);

	async run(
		files: File[],
		meta: { albumId?: number | null; inGallery?: boolean; consent: boolean },
		onEach: (m: MediaItem) => void
	) {
		this.total = files.length;
		this.done = 0;
		this.errors = [];
		for (const file of files) {
			try {
				onEach(await uploadImage(file, meta));
			} catch (e) {
				this.errors = [...this.errors, `${file.name}: ${errorText(e)}`];
			}
			this.done++;
		}
	}
}
