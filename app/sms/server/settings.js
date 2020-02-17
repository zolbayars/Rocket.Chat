import { Meteor } from 'meteor/meteor';

import { settings } from '../../settings';

Meteor.startup(function() {
	settings.addGroup('SMS', function() {
		this.add('SMS_Enabled', false, {
			type: 'boolean',
			i18nLabel: 'Enabled',
		});

		this.add('SMS_Service', 'twilio', {
			type: 'select',
			values: [
				{
					key: 'twilio',
					i18nLabel: 'Twilio',
				},
				{
					key: 'voxtelesys',
					i18nLabel: 'Voxtelesys',
				},
				{
					key: 'mobex',
					i18nLabel: 'Mobex',
				},
				{
					key: 'teli',
					i18nLabel: 'Mobex MMS',
				},
			],
			i18nLabel: 'Service',
		});

		this.section('Twilio', function() {
			this.add('SMS_Twilio_Account_SID', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'twilio',
				},
				i18nLabel: 'Account_SID',
				secret: true,
			});
			this.add('SMS_Twilio_authToken', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'twilio',
				},
				i18nLabel: 'Auth_Token',
				secret: true,
			});
		});

		this.section('Voxtelesys', function() {
			this.add('SMS_Voxtelesys_authToken', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'voxtelesys',
				},
				i18nLabel: 'Auth_Token',
				secret: true,
			});
			this.add('SMS_Voxtelesys_URL', 'https://smsapi.voxtelesys.net/api/v1/sms', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'voxtelesys',
				},
				i18nLabel: 'URL',
				secret: true,
			});
		});

		this.section('Mobex', function() {
			this.add('SMS_Mobex_gateway_address', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_address',
				i18nDescription: 'Mobex_sms_gateway_address_desc',
			});
			this.add('SMS_Mobex_restful_address', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_restful_address',
				i18nDescription: 'Mobex_sms_gateway_restful_address_desc',
			});
			this.add('SMS_Mobex_username', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_username',
			});
			this.add('SMS_Mobex_password', '', {
				type: 'password',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_password',
			});
			this.add('SMS_Mobex_from_number', '', {
				type: 'int',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_from_number',
				i18nDescription: 'Mobex_sms_gateway_from_number_desc',
			});
			this.add('SMS_Mobex_from_numbers_list', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_from_numbers_list',
				i18nDescription: 'Mobex_sms_gateway_from_numbers_list_desc',
			});
		});

		this.section('Mobex MMS', function() {
			this.add('SMS_Teli_restful_address', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'teli',
				},
				i18nLabel: 'Teli_sms_gateway_restful_address',
				i18nDescription: 'Teli_sms_gateway_restful_address_desc',
			});
			this.add('SMS_Teli_token', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'teli',
				},
				i18nLabel: 'Teli_sms_token',
				i18nDescription: 'Teli_sms_token_desc',
			});
			this.add('SMS_Teli_from_number', '', {
				type: 'int',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'teli',
				},
				i18nLabel: 'Teli_sms_from_number',
				i18nDescription: 'Teli_sms_from_number_desc',
			});
		});

		this.add('MMS_Mobex_from_numbers_list', '', {
			type: 'string',
			enableQuery: {
				_id: 'SMS_Service',
				value: 'teli',
			},
			i18nLabel: 'Mobex_sms_gateway_from_numbers_list_mms',
			i18nDescription: 'Mobex_sms_gateway_from_numbers_list_desc',
		});
	});
});
