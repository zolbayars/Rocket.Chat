import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { Session } from 'meteor/session'
import toastr from 'toastr';
import _ from 'underscore';

const numberList = {
	14439370949: '+14439370949',
	18139900996: '+18139900996',
	18139990990: '+18139990990',
	17272708181: '+17272708181',
	12129181876: '+12129181876',
	12028755580: '+12028755580',
	18135638800: '+18135638800',
	18339568700: '+18339568700',
	18558766239: '+18558766239',
	18448555611: '+18448555611',
	18132804355: '+18132804355',
}

const validatePhoneNum = (numbers) => {
	const reg = new RegExp(`^[0-9]{7,15}(,[0-9]{7,15})*$`);
	return reg.test(numbers);
};

const validateCSVPhoneNum = (numbers) => {
	const reg = new RegExp(`^[0-9]{7,15}(\r\n[0-9]{7,15})*$`);
	return reg.test(numbers);
};

readFile = function(f,onLoadCallback) {
 var reader = new FileReader();
 reader.onload = function (e){
  var contents=e.target.result
  onLoadCallback(contents);
 }
 reader.readAsText(f);
};

Template.sendSMS.onCreated(function() {
	this.fromNumber = new ReactiveVar(Object.keys(numberList)[0]);
	this.toNumbers = new ReactiveVar(false);
	this.toNumbersCSV = new ReactiveVar(false);
	this.smsText = new ReactiveVar(false);

	Session.set('smsLength', 0);
	Session.set('uploadedFileName', '');
});

Template.sendSMS.helpers({
	fromNumbers() {
		const result = Object.entries(numberList)
			.map(([number, formattedNumber]) => ({ name: formattedNumber, key: number }));

		return result;
	},
	assetAccept() {
		if (fileConstraints.extensions && fileConstraints.extensions.length) {
			return `.${ fileConstraints.extensions.join(', .') }`;
		}
	},
	smsLength() {
    return Session.get('smsLength');
  },
	uploadedFileName() {
		let fileName = Session.get('uploadedFileName');
    return fileName == '' ? '' : 'Uploaded: ' + fileName;
  }
});

Template.sendSMS.events({
	'change [name='fromNumber']'(e, t) {
		t.fromNumber.set(e.target.value);
	},
	'change [name='toNumbers']'(e, t) {
		t.toNumbers.set(e.target.value);
	},
	'input [name='smsText']'(e, t) {
		const input = e.target;
		t.smsText.set(input.value);
		Session.set('smsLength', input.value.length);
	},
	'input [name='toNumbersCSV']'(e, t) {
		const input = e.target;

		if(input.files && input.files.length > 0){
			Session.set('uploadedFileName', input.files[0].name);
		}

		readFile(input.files[0], function(content) {
			if(validateCSVPhoneNum(content)){
				t.toNumbersCSV.set(content);
			}
   	});
	},
	'submit .send-sms__content'(e, instance) {
		e.preventDefault();
		e.stopPropagation();
		let toNumbers = instance.toNumbers.get();
		const fromNumber = instance.fromNumber.get();
		let toNumbersCSV = instance.toNumbersCSV.get();
		const smsText = instance.smsText.get();

		if(!validatePhoneNum(toNumbers) && !toNumbersCSV){
			toastr.warning(TAPi18n.__('Send_sms_with_mobex_error_to_num'));
			return false;
		}

		if(!smsText || smsText == '' || smsText.length == 0){
			toastr.warning(TAPi18n.__('Send_sms_with_mobex_error_text'));
			return false;
		}

		let toNumbersArr = [];

		if(!toNumbers){
			toNumbers = toNumbersCSV
			toNumbersArr = toNumbers.split(/\r?\n/);
		}

		if(toNumbers.indexOf(',') > -1 || toNumbersArr.length > 0){
			if(toNumbersArr.length == 0){
				toNumbersArr = toNumbers.split(',');
			}

			Meteor.call('sendBatchSMS', fromNumber, toNumbersArr, smsText, (err, smsResult) => {
				console.log('smsResult in sendSMS: ', smsResult);

				if(!err){
					if(smsResult['isSuccess']){

						let smsCountText = '0';
						try {
							mobexGatewayResult = JSON.parse(smsResult['data']);
							smsCountText = mobexGatewayResult['data']['messageCount'];
						} catch (e) {

						}

						toastr.success(TAPi18n.__('Send_sms_with_mobex_success') + ' ' + smsCountText + ' message sent.');
					}else{
						toastr.error(smsResult['resultMsg']);
					}

				}else{
					toastr.error(TAPi18n.__('Send_sms_with_mobex_error'));
				}

			});
		}else{
			Meteor.call('sendSingleSMS', fromNumber, toNumbers, smsText, (err, smsResult) => {

				if(!err){
					if(smsResult['isSuccess']){
						toastr.success(TAPi18n.__('Send_sms_with_mobex_success') + ' ' + smsResult['resultMsg']);
					}else{
						toastr.error(smsResult['resultMsg']);
					}

				}else{
					toastr.error(TAPi18n.__('Send_sms_with_mobex_error'));
				}

			});
		}

		return false;
	},
});
