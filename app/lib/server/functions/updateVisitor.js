import { LivechatVisitors } from '../../../models';

export const updateVisitor = function(visitorId, visitorData) {
	LivechatVisitors.update({ _id: visitorId }, { $set: { name: visitorData.name } });
};
