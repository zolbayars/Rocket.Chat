import { Messages } from '../../../models';

export const updateVisitorMessages = function(visitorId, visitorData) {
	Messages.update({ 'u._id': visitorId }, { $set: { 'u.name': visitorData.name } });
};
