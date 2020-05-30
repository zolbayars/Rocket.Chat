import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import toastr from 'toastr';

// import { settings } from '../../../../settings';
import { t } from '../../../../utils';

const validatePhoneNum = (numbers) => {
	const reg = new RegExp('^[0-9]{7,15}(,[0-9]{7,15})*$');
	return reg.test(numbers);
};

const validateCSVPhoneNum = (numbers) => {
	const numbersArr = numbers.split(/\r?\n/);
	let valid = true;
	numbersArr.forEach((number) => {
		if (number !== '') {
			valid = validatePhoneNum(number);
		}
	});
	// const reg = new RegExp('^[0-9]{7,15}((\n)*[0-9]{7,15})*$');
	return valid;
};

const readFile = function(f, onLoadCallback) {
	const reader = new FileReader();
	reader.onload = function(e) {
		const contents = e.target.result;
		onLoadCallback(contents);
	};
	reader.readAsText(f);
};

const readMMSFile = function(f, onLoadCallback) {
	const reader = new FileReader();
	reader.onload = function(e) {
		const contents = e.target.result;
		onLoadCallback(contents);
	};
	reader.readAsArrayBuffer(f);
};


Template.sendSMS.onCreated(function() {
	this.toNumbers = new ReactiveVar(false);
	this.toNumbersCSV = new ReactiveVar(false);
	this.smsText = new ReactiveVar(false);

	this.mmsFile = new ReactiveVar(false);
	this.mmsFileName = new ReactiveVar(false);

	this.fromNumbersList = new ReactiveVar({});
	this.fromNumber = new ReactiveVar('');

	Meteor.call('getFromNumbersList', (err, fromNumbersArr) => {
		if (!err) {
			this.fromNumbersList.set(fromNumbersArr);
			this.fromNumber.set(Object.keys(fromNumbersArr)[0]);
		} else {
			toastr.error(t('Send_sms_with_mobex_error_from_number_list'));
		}
	});

	Session.set('smsLength', 0);
	Session.set('uploadedFileName', '');
	Session.set('uploadedMMSFileName', '');
});

Template.sendSMS.helpers({
	fromNumbers() {
		// console.log('fromNumbers from template', Template.instance().fromNumbersList.get());
		// console.log(Object.entries(Template.instance().fromNumbersList));
		// console.log(Object.keys(Template.instance().fromNumbersList.get()));

		const result = Object.entries(Template.instance().fromNumbersList.get())
			.map(([number, formattedNumber]) => ({ name: formattedNumber, key: number }));

		return result;
	},
	assetAccept() {
		// if (fileConstraints.extensions && fileConstraints.extensions.length) {
		// 	return `.${ fileConstraints.extensions.join(', .') }`;
		// }

		return '';
	},
	smsLength() {
		return Session.get('smsLength');
	},
	uploadedFileName() {
		const fileName = Session.get('uploadedFileName');
		return fileName === '' ? '' : `Uploaded: ${ fileName }`;
	},
	uploadedMMSFileName() {
		const fileName = Session.get('uploadedMMSFileName');
		return fileName === '' ? '' : `Uploaded: ${ fileName }`;
	},
});

Template.sendSMS.events({
	'change [name="fromNumber"]'(e, t) {
		t.fromNumber.set(e.target.value);
	},
	'change [name="toNumbers"]'(e, t) {
		t.toNumbers.set(e.target.value);
	},
	'input [name="smsText"]'(e, t) {
		const input = e.target;
		t.smsText.set(input.value);
		Session.set('smsLength', input.value.length);
	},
	'input [name="toNumbersCSV"]'(e, t) {
		const input = e.target;

		if (input.files && input.files.length > 0) {
			Session.set('uploadedFileName', input.files[0].name);
		}

		readFile(input.files[0], function(content) {
			if (validateCSVPhoneNum(content)) {
				t.toNumbersCSV.set(content);
			}
		});
	},
	'input [name="mmsFile"]'(e, t) {
		const input = e.target;

		if (input.files && input.files.length > 0) {
			Session.set('uploadedMMSFileName', input.files[0].name);
		}

		readMMSFile(input.files[0], function(content) {
			t.mmsFile.set(content);
			t.mmsFileName.set(input.files[0].name);
		});
	},
	'submit .send-sms__content'(e, instance) {
		e.preventDefault();
		e.stopPropagation();
		let toNumbers = instance.toNumbers.get();
		const fromNumber = instance.fromNumber.get();
		const toNumbersCSV = instance.toNumbersCSV.get();
		const smsText = instance.smsText.get();

		console.log('toNumbers', toNumbers);
		console.log('fromNumber', fromNumber);
		console.log('toNumbersCSV', toNumbersCSV);
		console.log('smsText', smsText);

		if (!validatePhoneNum(toNumbers) && !toNumbersCSV) {
			toastr.warning(t('Send_sms_with_mobex_error_to_num'));
			return false;
		}

		if (!smsText || smsText === '' || smsText.length === 0) {
			toastr.warning(t('Send_sms_with_mobex_error_text'));
			return false;
		}

		let toNumbersArr = [];

		if (!toNumbers) {
			toNumbers = toNumbersCSV;
			toNumbersArr = toNumbers.split(/\r?\n/);
		}

		if (toNumbers.indexOf(',') > -1 || toNumbersArr.length > 0) {
			if (toNumbersArr.length === 0) {
				toNumbersArr = toNumbers.split(',');
			}

			console.log('toNumbersArr', toNumbersArr);
			const filteredArr = toNumbersArr.filter((number) => number !== '');
			console.log('filteredArr', filteredArr);

			Meteor.call('sendBatchSMS', fromNumber, filteredArr, smsText, (err, smsResult) => {
				console.log('smsResult in sendSMS: ', smsResult);

				if (!err) {
					if (smsResult.isSuccess) {
						let smsCountText = '0';
						try {
							const mobexGatewayResult = JSON.parse(smsResult.data);
							smsCountText = mobexGatewayResult.data.messageCount;
						} catch (e) {
							console.error('Error in sendBatchSMS sendSMS.js', e);
						}

						toastr.success(`${ t('Send_sms_with_mobex_success') } ${ smsCountText } message sent.`);
					} else {
						toastr.error(smsResult.resultMsg);
					}
				} else {
					toastr.error(t('Send_sms_with_mobex_error'));
				}
			});
		} else {
			Meteor.call('sendSingleSMS', fromNumber, toNumbers, smsText, (err, smsResult) => {
				if (!err) {
					if (smsResult.isSuccess) {
						toastr.success(`${ t('Send_sms_with_mobex_success') } ${ smsResult.resultMsg }`);
					} else {
						toastr.error(smsResult.resultMsg);
					}
				} else {
					toastr.error(t('Send_sms_with_mobex_error'));
				}
			});
		}

		return false;
	},

	'click #mms-send-button'(e, instance) {
		e.preventDefault();
		e.stopPropagation();
		let toNumbers = instance.toNumbers.get();
		const fromNumber = instance.fromNumber.get();
		const toNumbersCSV = instance.toNumbersCSV.get();
		const mmsFile = instance.mmsFile.get();
		const mmsFileName = instance.mmsFileName.get();

		console.log('mmsFile', mmsFile);
		console.log('mmsFile', new Uint8Array(mmsFile));

		if (!validatePhoneNum(toNumbers) && !toNumbersCSV) {
			toastr.warning(t('Send_sms_with_mobex_error_to_num'));
			return false;
		}

		if (!mmsFile) {
			toastr.warning(t('Send_mms_with_mobex_error_text'));
			return false;
		}

		let toNumbersArr = [];

		if (!toNumbers) {
			toNumbers = toNumbersCSV;
			toNumbersArr = toNumbers.split(/\r?\n/);
		}

		if (toNumbers.indexOf(',') > -1 || toNumbersArr.length > 0) {
			if (toNumbersArr.length === 0) {
				toNumbersArr = toNumbers.split(',');
			}

			Meteor.call('sendBatchMMS', fromNumber, toNumbersArr, mmsFileName, new Uint8Array(mmsFile), (err, smsResult) => {
				console.log('smsResult in sendSMS: ', smsResult);

				if (!err) {
					if (smsResult.isSuccess) {
						let smsCountText = '0';
						try {
							const mobexGatewayResult = JSON.parse(smsResult.data);
							smsCountText = mobexGatewayResult.data.messageCount;
						} catch (e) {
							console.error('Error in sendBatchSMS sendSMS.js', e);
						}

						toastr.success(`${ t('Send_sms_with_mobex_success') } ${ smsCountText } message sent.`);
					} else {
						toastr.error(smsResult.resultMsg);
					}
				} else {
					toastr.error(t('Send_sms_with_mobex_error'));
				}
			});
		} else {
			Meteor.call('sendSingleMMS', fromNumber, toNumbers, mmsFileName, new Uint8Array(mmsFile), (err, smsResult) => {
				if (!err) {
					if (smsResult.isSuccess) {
						toastr.success(`${ t('Send_sms_with_mobex_success') } ${ smsResult.resultMsg }`);
					} else {
						toastr.error(smsResult.resultMsg);
					}
				} else {
					toastr.error(t('Send_sms_with_mobex_error'));
				}
			});
		}

		return false;
	},
});
