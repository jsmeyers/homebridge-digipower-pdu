"use strict";
var promisify = require("es6-promisify");
var snmp = require("net-snmp");
var portcounted = 1;
var Characteristic, Service;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory("homebridge-snmp-switch", "SNMPSwitch", PDUAccessory);
}

class PDUAccessory {

	constructor(log, config) {
		this.log = log;
		this.services = [];
		this.portcount = snmp.createSession(config.ip, config.snmp_community);
		this.portcount_get = promisify(this.portcount.get.bind(this.portcount));
		var switch_oid = '1.3.6.1.2.1.2.1.0';
		portcounted  = this.portcount_get([switch_oid])
			.then(varbinds => {
				this.log.info(varbinds);
				var switches = varbinds[0].value.toString().split(',');
				this.log.info(switches);
				callback(switches);
			})
			.catch(error => {
				console.log.info(`Error retrieving interface count.`);
				callback(error, null);
			});
		this.log.info('Counted this many ports: ' + portcounted);
		for (var i = 0; i < 25; i++) {
			var service = new Service.Outlet(`Outlet ${i}`, i);
			this.services.push(service);

			service.getCharacteristic(Characteristic.On)
				.on('get', this.getOn.bind(this, i))
				.on('set', this.setOn.bind(this, i));
  			service.getCharacteristic(Characteristic.OutletInUse)
        			.on('get', this.getOutletInUse.bind(this, i));
		}

		this.snmp = snmp.createSession(config.ip, config.snmp_community);
		this.snmp_get = promisify(this.snmp.get.bind(this.snmp));
		this.snmp_set = promisify(this.snmp.set.bind(this.snmp));

		var outlet_oids = [];
		for (var i = 0; i < ; i++) {
			outlet_oids.push(`1.3.6.1.2.1.31.1.1.1.18.${i + 1}`);
			console.log(`oids.push 1.3.6.1.2.1.31.1.1.1.18.${i + 1}`)	
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
				for (var i = 1; i < names.length; i++) {
					var name = names[i]
					service = this.services[i];
					service.displayName = name;
					service.setCharacteristic(Characteristic.Name, name);
				}
				this.log.info('Successfully interface names: ', names.join(', '));
			
			})
			.catch(error => {
				this.log.error(error.stack);
			});
	}

	getServices() {
		return this.services;
	}
	
	getPortCount(callback) {
		this.log.info(`Retrieving interface count`);
		var switch_oid = '1.3.6.1.2.1.2.1.0';
		this.snmp.get([switch_oid])
			.then(varbinds => {
				this.log.info(varbinds);
				var switches = varbinds[0].value.toString().split(',');
				this.log.info(switches);
				callback(switches);
			})
			.catch(error => {
				this.log.info(`Error retrieving interface count.`);
				callback(error, null);
			});	
	}	
	
	getOutletInUse(index, callback) {
		index = index + 1
		this.log.info(`Retrieving interface ${index}.`);
		var switch_oid = '1.3.6.1.2.1.2.2.1.8';
		var testoid = switch_oid + '.' + index;
		this.log.info(testoid);
		this.snmp_get([testoid])
			.then(varbinds => {
				this.log.info(varbinds);
				var switches = varbinds[0].value.toString().split(',');
				this.log.info(switches);
				var on = switches[0] == "1";
				this.log.info(`Socket ${index} is ${on}.`);
				callback(null, on);
			})
			.catch(error => {
				this.log.info(`Error retrieving socket ${index} in use status.`);
				callback(error, null);
			});	
	}	
	getOn(index, callback) {
		index = index + 1
		this.log.info(`Retrieving interface ${index}.`);
		var switch_oid = '1.3.6.1.2.1.2.2.1.7';
		var testoid = switch_oid + '.' + index;
		this.log.info(testoid);
		this.snmp_get([testoid])
			.then(varbinds => {
				this.log.info(varbinds);
				var switches = varbinds[0].value.toString().split(',');
				this.log.info(switches);
				var on = switches[0] == "1";
				this.log.info(`Socket ${index} is ${on}.`);
				callback(null, on);
			})
			.catch(error => {
				this.log.info(`Error retrieving socket ${index} status.`);
				callback(error, null);
			});
	}

	setOn(index, on, callback) {
		if (on == 0)
		{
    			on = 2;
		};
		index = index + 1
		this.log.info(`Switching POE interface ${index} to ${on}.`);
		var switch_oid = '1.3.6.1.2.1.2.2.1.7';
		var testoid = switch_oid + '.' + index;
		this.log.info(testoid);
		this.snmp_get([testoid])
			.then(varbinds => {
				this.log.info(varbinds);
				var switches = varbinds[0].value.toString().split(',');
				this.log.info(switches);				
				switches[0] = on ? '1' : '2'
				this.log.info(switches);
				var switch_str = switches.join();
				this.log.info(switch_str);
				varbinds = [
					{
						oid: testoid,
						type: snmp.ObjectType.Integer,
						value: on
					}
				];
				this.log.info(varbinds);
				return varbinds
			})
			.then(this.snmp_set)
			.then(() => {
				this.log.info(`Successfully switched interface ${index} to ${on}.`);
				callback(null);
			})
			.catch(error => {
				this.log.error(`Error switching interface ${index} to ${on}.`);
				callback(error);
			});
	}

}
