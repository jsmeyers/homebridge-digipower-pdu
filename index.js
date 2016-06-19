"use strict";
var promisify = require("es6-promisify");
var snmp = require("net-snmp");

var Characteristic, Service;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory("homebridge-digipower-pdu", "DigiPower PDU", PDUAccessory);
}

class PDUAccessory {

	constructor(log, config) {
		this.log = log;
		this.services = [];
		for (var i = 0; i < 8; i++) {
			var service = new Service.Outlet(`Outlet ${i}`, i);
			this.services.push(service);

			service.getCharacteristic(Characteristic.On)
				.on('get', this.getOn.bind(this, i))
				.on('set', this.setOn.bind(this, i));
		}

		this.snmp = snmp.createSession(config.ip, config.snmp_community);
		this.snmp_get = promisify(this.snmp.get.bind(this.snmp));
		this.snmp_set = promisify(this.snmp.set.bind(this.snmp));

		var outlet_oids = [];
		for (var i = 0; i < 8; i++) {
			outlet_oids.push(`1.3.6.1.4.1.17420.1.2.9.1.14.${i + 1}.0`);
		}
		var promises = [];
		for (var i = 0; i < outlet_oids.length; i += 2) {
			var slice = outlet_oids.slice(i, i + 2);
			promises.push(this.snmp_get(slice))
		}
		Promise.all(promises)
			.then(results => {
				var names = results
					.reduce((prev, current) => {
						return prev.concat(current);
					}, [])
					.map(varbind => {
						return varbind.value.toString().split(",")[0];
					});
				for (var i = 0; i < names.length; i++) {
					var name = names[i]
					service = this.services[i];
					service.displayName = name;
					service.setCharacteristic(Characteristic.Name, name);
				}
				this.log.info('Successfully loaded outlet names: ', names.join(', '));
			})
			.catch(error => {
				this.log.error(error.stack);
			});
	}

	getServices() {
		return this.services;
	}

	getOn(index, callback) {
		this.log.info(`Retrieving socket ${index}.`);
		var switch_oid = '1.3.6.1.4.1.17420.1.2.9.1.13.0';
		this.snmp_get([switch_oid])
			.then(varbinds => {
				var switches = varbinds[0].value.toString().split(',');
				var on = switches[index] == "1"
				this.log.info(`Socket ${index} is ${on}.`);
				callback(null, on);
			})
			.catch(error => {
				this.log.info(`Error retrieving socket ${index} status.`);
				callback(error, null);
			});
	}

	setOn(index, on, callback) {
		this.log.info(`Switching socket ${index} to ${on}.`);
		var switch_oid = '1.3.6.1.4.1.17420.1.2.9.1.13.0';
		this.snmp_get([switch_oid])
			.then(varbinds => {
				var switches = varbinds[0].value.toString().split(',');
				switches[index] = on ? '1' : '0';
				var switch_str = switches.join();
				varbinds = [
					{
						oid: switch_oid,
						type: snmp.ObjectType.OctetString,
						value: switch_str
					}
				];
				return varbinds
			})
			.then(this.snmp_set)
			.then(() => {
				this.log.info(`Successfully switched socket ${index} to ${on}.`);
				callback(null);
			})
			.catch(error => {
				this.log.error(`Error switching socket ${index} to ${on}.`);
				callback(error);
			});
	}

}
