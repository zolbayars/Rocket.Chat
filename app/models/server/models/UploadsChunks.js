import { Base } from './_Base';

export class UploadsChunks extends Base {
	constructor() {
		super('uploads.chunks');
	}

	/**
	 * Find by files_id
	 */
	findByFileId(files_id, options) {
		const query = {
			files_id,
		};

		return this.findOne(query, options);
	}
}

export default new UploadsChunks();
