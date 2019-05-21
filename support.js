// BIDMC ITS: Who Am I for Field and Support teams
// https://chrome.google.com/webstore/detail/bidmc-its-who-am-i/njjibjhkpfiaeggeapoahigncabpcbap
//
// 21-May-2019 rhurst
// added "sn" attribute for DHCP naming construction (TechDev does not use AssetID)
// 14-Mar-2019 rhurst
// properly load this asset OU in picklist, account for Asset IDs in TechDev OU
// 11-Oct-2018 rhurst
// UI corrections
// 18-Sep-2018 rhurst
// ASUS Chrome Box 3 install: v1.2.3
// 23-Aug-2018 rhurst
// Chrome deployment: v1.1.6
// 28-Jun-2018 rhurst
// AWS hosting: v1.1.4
// 10-May-2018 rhurst
// staging milestone: v1.1.0
// 03-May-2018 rhurst
// IC "new & deploy" workflow
// 19-Apr-2018 rhurst
// draft

const DEBUG = false;
const CROSBY = DEBUG ? 'http://8ball.bidmc.harvard.edu:3333/crosby/' : 'https://crosby.bidmc.org/crosby/';
let headers = new Headers();
//headers.append('Content-Type', 'application/json');

let gcbyou = { '/': { nic:1, wifi:2, sn:99 } };
let nic = '';
let wifi = '';
let sn = '';

let info = document.getElementById("info");
let status = document.getElementById("status");
let work = document.getElementById("work");
let tech = document.getElementById("tech");

let loaded = true;

document.getElementById("FieldSupport").addEventListener("change", toggleUI);
document.getElementById("authorize").addEventListener("submit", authorize);

document.getElementById("keyButton").addEventListener("click", findAssetBydeviceId);
document.getElementById("serialNumberButton").addEventListener("click", findAssetByserialNumber);
document.getElementById("nicAddressButton").addEventListener("click", findAssetBynicAddress);
document.getElementById("wifiAddressButton").addEventListener("click", findAssetBywifiAddress);
document.getElementById("assetIdButton").addEventListener("click", findAssetByannotatedAssetId);

document.getElementsByName("annotatedLocation")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });
document.getElementsByName("annotatedUser")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });
document.getElementsByName("notes")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });
document.getElementById("patch").addEventListener("submit", patch);

document.getElementById("toOU").addEventListener("change", () => {
	namingConvention();
	document.getElementById("moveButton").disabled = false;
	document.getElementsByName("reboot")[0].hidden = false;
});
document.getElementById("moveTo").addEventListener("submit", moveTo);

//document.getElementsByName("annotatedAssetId")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });

function toggleUI()
{
	info.hidden = !info.hidden;
	work.hidden = info.hidden;
	tech.hidden = !info.hidden;
	fail(false);
}

function wait() {
	document.body.style.cursor = 'wait';
	status.title = `waiting on ${CROSBY} reply`;
	status.src = 'assets/yellow_light.png';
}

function fail(alert=true) {
	if (alert) {
		console.log('fail');
		status.src = 'assets/red_light.png';
		status.title = `NOT connected to ${CROSBY}`;
	}
	else {
		status.src = 'assets/yellow_light.png';
		status.title = 'idle';
	}
	document.body.style.cursor = '';
	loadAsset({});
	work.hidden = true;
	let logon = document.getElementById("logon");
	logon.disabled = false;
	headers = new Headers();
	document.getElementsByName('password')[0].value = '';
	let id = document.getElementsByName('id')[0];
	id.value = '';
	id.focus();
}

function light(ok) {
	console.log(ok);
	document.body.style.cursor = '';
	let logon = document.getElementById("logon");
	if (ok) {
		logon.disabled = true;
		status.src = 'assets/green_light.png';
		status.title = `connected to ${CROSBY}`;
		work.hidden = false;
	}
	else {
		status.src = 'assets/yellow_light.png';
		status.title = '';
		loadAsset({});
	}
}

function authorize()
{
	let username = document.getElementsByName('id')[0].value;
	let password = document.getElementsByName('password')[0].value;
	headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));
	loadOU();

	if (chrome.enterprise) {
		chrome.enterprise.deviceAttributes.getDirectoryDeviceId(deviceId => {
			if (deviceId) {
				fetch(`${CROSBY}device/?id=${deviceId}`, { method: 'GET', headers: headers, mode: 'cors' }).then(function (res) {
					light(res.ok);
					return res.json().then(function (data) {
						loadAsset(data);
					})
				}).catch(function (err) { fail(); })
			}
		});
	}
}

function loadOU() {
	//let watch: HTMLOptionsCollection = <any>el
	let el = document.getElementById('toOU');
	wait();
	fetch(`${CROSBY}ou/`,
	{ method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
		light(res.ok);
		return res.json().then(function (data) {
			for (let i in data) {
				let option = document.createElement("option");
				option.text = data[i].key;
				option.value = data[i].value;
				el.add(option);
			}
			el.selectedIndex = -1;
		})
	}).catch(function (err) {
		console.log(err);
		fail(); 
	})

	fetch(`${CROSBY}gc-by-ou.json`,
	{ method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
		return res.json().then(function (data) {
//			console.log(data);
			Object.assign(gcbyou, data);
		})
	}).catch(function (err) {
		console.log(err);
		fail(); 
	})
}

function loadAsset(data) {
	loaded = true;
	document.getElementsByName('key')[0].value = data.deviceId || '';
	document.getElementsByName('orgUnitPath')[0].value = data.orgUnitPath || '';
	document.getElementsByName('model')[0].value = data.model || '';
	document.getElementsByName('serialNumber')[0].value = data.serialNumber || '';
	document.getElementsByName('nicAddress')[0].value = data.ethernetMacAddress || '';
	document.getElementsByName('wifiAddress')[0].value = data.macAddress || '';
	document.getElementsByName('osVersion')[0].value = data.osVersion || '';
	document.getElementsByName('annotatedLocation')[0].value = data.annotatedLocation || '';
	document.getElementsByName('annotatedUser')[0].value = data.annotatedUser || '';
	document.getElementsByName('notes')[0].value = data.notes || '';

	let el = document.getElementById('toOU');
	el.selectedIndex = -1;
	for (let i = 0; i < el.length; i++)
		if (el[i].text == data.orgUnitPath)
			el.selectedIndex = i;

	document.getElementsByName('annotatedAssetId')[0].value = data.annotatedAssetId || '';
	nic = document.getElementsByName("nicAddress")[0].value.replace(/:/g,'').toUpperCase();
	wifi = document.getElementsByName("wifiAddress")[0].value.replace(/:/g,'').toUpperCase();
	sn = document.getElementsByName("serialNumber")[0].value.replace(/:/g,'').toUpperCase();
	
	document.getElementById("patchButton").disabled = true;
	document.getElementById("moveButton").disabled = true;
	document.getElementsByName("reboot")[0].hidden = true;

	let dns = document.getElementById('dns');
	if (data.annotatedAssetId) {
		fetch(`${CROSBY}hostname/?asset_id=${data.annotatedAssetId}`, { method: 'GET', headers: headers, mode: 'cors' }).then(function (res) {
			return res.json().then(function (data) {
				dns.innerText = data.ip ? data.ip : 'empty DNS lookup';
				dns.title = data.hosts ? data.hosts.toString() : '(empty reverse DNS)';
			})
		}).catch(function (err) {
			dns.innerText = err.message
		})
	}
	else {
		dns.innerText = '...';
		dns.title = 'DNS resolve for Asset ID';
	}
}

function findAssetBydeviceId() {
	let deviceId = document.getElementsByName("key")[0].value;
	loadAsset({});
	if (deviceId.length > 2) {
		wait();
		fetch(`${CROSBY}device/?id=${deviceId}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			loadAsset(res.json);
			return res.json().then(function (data) {
				loadAsset(data);
			})
		}).catch(function (err) { fail(); })
	}
}

//	http://support.google.com/chromeos/a/bin/answer.py?hl=en&answer=1698333
function findAssetByserialNumber() {
	let serialNumber = document.getElementsByName("serialNumber")[0].value;
	loadAsset({});
	if (serialNumber.length > 2) {
		wait();
		fetch(`${CROSBY}devices/?id=${serialNumber}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				loadAsset(data[0]);
			})
		}).catch(function (err) { fail(); })
	}
}

function findAssetBynicAddress() {
	let macAddress = document.getElementsByName("nicAddress")[0].value.replace(/:/g,'').toLowerCase();
	loadAsset({});
	if (macAddress.length > 2) {
		wait();
		fetch(`${CROSBY}devices/?ethernet_mac=${macAddress}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				loadAsset(data[0]);
			})
		}).catch(function (err) { fail(); })
	}
}

function findAssetBywifiAddress() {
	let macAddress = document.getElementsByName("wifiAddress")[0].value.replace(/:/g,'').toLowerCase();
	loadAsset({});
	if (macAddress.length > 2) {
		wait();
		fetch(`${CROSBY}devices/?wifi_mac=${macAddress}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				loadAsset(data[0]);
			})
		}).catch(function (err) { fail(); })
	}
}

function findAssetByannotatedAssetId() {
	let annotatedAssetId = document.getElementsByName("annotatedAssetId")[0].value;
	loadAsset({});
	if (annotatedAssetId.length > 2) {
		wait();
		fetch(`${CROSBY}devices/?asset_id=${annotatedAssetId}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				loadAsset(data[0]);
			})
		}).catch(function (err) { fail(); })
	}
}

function moveTo() {
	let deviceId = document.getElementsByName("key")[0].value;
	let el = document.getElementById('toOU');
	let ou = '';
	if (el.selectedIndex >= 0)
		ou = el[el.selectedIndex].text;	//	.value "fails" if it has a leading "0", go figure
	if (deviceId && ou) {
		wait();
		fetch(`${CROSBY}move/?id=${deviceId}&ou=${ou}`, { method: 'POST', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			//light(res.ok);
			//findAssetBydeviceId();
			patch();
		}).catch(function (err) { fail(); })
	}
}

function patch() {
	let deviceId = document.getElementsByName("key")[0].value;
	if (deviceId) {
		wait();

		namingConvention();
		let annotatedAssetId = document.getElementsByName('annotatedAssetId')[0].value;
		let annotatedLocation = document.getElementsByName('annotatedLocation')[0].value;
		let annotatedUser = document.getElementsByName('annotatedUser')[0].value;
		let notes = document.getElementsByName('notes')[0].value;

		fetch(`${CROSBY}patch/?id=${deviceId}&annotatedAssetId=${encodeURIComponent(annotatedAssetId)}&annotatedLocation=${encodeURIComponent(annotatedLocation)}&annotatedUser=${encodeURIComponent(annotatedUser)}&notes=${encodeURIComponent(notes)}`,
		{ method: 'POST', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				findAssetBydeviceId();
			})
		}).catch(function (err) { fail(); })
	}
}

// assert our naming convention
function namingConvention() {
	//	Google Chrome + MAC address
	let result = 'GC-' + (nic || wifi || sn || 'restart');

	let el = document.getElementById('toOU');
	let ou = '';
	if (el.selectedIndex >= 0)
		ou = el[el.selectedIndex].text;	//	.value "fails" if it has a leading "0", go figure
	else {
		ou = document.getElementsByName('orgUnitPath')[0].value
		if (ou)
			for (let i = 0; i < el.length; i++)
				if (el[i].text == ou)
					el.selectedIndex = i;
	}
	if (ou) {
		let keys = Object.keys(gcbyou).sort();
		let key = ''
		keys.forEach(k => {
			if (ou.startsWith(k)) key = gcbyou[k]
		});
		if (key) {
			if (key.sn && (key.sn < key.wifi && key.sn < key.nic))
				result = key.prefix + sn
			if (key.nic < key.wifi)
				result = key.prefix + (nic || wifi || sn)
			else
				result = key.prefix + (wifi || nic || sn)
			if (result == key.prefix || (!nic && !wifi && !sn))
				result = ''
		}
	}

	let annotatedAssetId = document.getElementsByName('annotatedAssetId')[0].value.toUpperCase();
	//.replace(/[^\w\s]|_/g, "").replace(/\s+/g, "")
	if (result != annotatedAssetId) {
		document.getElementsByName('annotatedAssetId')[0].value = result;
		document.getElementsByName("reboot")[0].hidden = loaded;
		loaded = false;
	}
}
