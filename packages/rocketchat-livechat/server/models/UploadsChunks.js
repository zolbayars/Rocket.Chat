import { RocketChat } from 'meteor/rocketchat:lib';
import _ from 'underscore';

class UploadsChunks extends RocketChat.models._Base {
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
