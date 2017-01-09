# homebridge-snmp-switch
HomeBridge plugin for SNMP Switch

I thought that I could create snmp based Homebridge plugin for my network switch using the PDU plugin from 
https://github.com/invliD/homebridge-digipower-pdu while I have gotten many things to work but I cannot 
decide how to iterate ports that are active/ ports that are not enabled/ ports that are powered / ports 
that power is disabled. I have at least for the time being settled on a plugin that can display all the network ports of a given switch using the description field at 1.3.6.1.2.1.31.1.1.1.18. Shows the administrative state of the port at 1.3.6.1.2.1.2.2.1.7 and the actual up/down state of the port at 1.3.6.1.2.1.2.2.1.8. 

Currently it is configured using the following lines in the config.json of Homebridge:

{
  "accessory": "SNMPSwitch",
  "ip": "10.0.0.32",
  "snmp_community": "public",
  "portcount": "24",
  "name": "MyNetworkSwitch"
}


This plugin utilizes the SNMPSwitch accessory name and the ip is the IP of your network switch and the commmunity is your SNMP community it does require read/write for disabling ports. While I would have preferred to utilize the SNMP oid of interface count to allow enumeration I couldn't get it to work so the portcount is the number of ports on the switch. In Homekit interfaces ethernet status of the port is show whether the port is up or down under the OutletInUse characteristic. This may have some use in a fully wired infrastructure to block students by a teacher.

The method invliD used is great for iterating thru a number of interfaces works very well without holding up the Homebridge load of 24 interfaces.
