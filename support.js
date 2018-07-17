// BIDMC ITS: Who Am I for Field and Support teams
//
// 28-Jun-2018 rhurst
// AWS hosting: v1.1.4
// 10-May-2018 rhurst
// staging milestone: v1.1.0
// 03-May-2018 rhurst
// IC "new & deploy" workflow
// 19-Apr-2018 rhurst
// draft

//const CROSBY = 'https://rhurst-laptop.bidmc.harvard.edu:3333/crosby/'
//const CROSBY = 'https://cassiopeia.bidmc.harvard.edu/crosby/'
const CROSBY = 'https://crosby.bidmc.org/crosby/'
let headers = new Headers();
//headers.append('Content-Type', 'application/json');

let info = document.getElementById("info");
let status = document.getElementById("status");
let work = document.getElementById("work");
let tech = document.getElementById("tech");

document.getElementById("FieldSupport").addEventListener("change", toggleUI);
document.getElementById("authorize").addEventListener("submit", authorize);

document.getElementById("keyButton").addEventListener("click", findAssetBydeviceId);
document.getElementById("serialNumberButton").addEventListener("click", findAssetByserialNumber);
document.getElementById("macAddressButton").addEventListener("click", findAssetBymacAddress);
document.getElementById("assetIdButton").addEventListener("click", findAssetByannotatedAssetId);

document.getElementsByName("annotatedAssetId")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });
document.getElementsByName("annotatedLocation")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });
document.getElementsByName("annotatedUser")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });
document.getElementsByName("notes")[0].addEventListener("change", () => { document.getElementById("patchButton").disabled = false; });
document.getElementById("patch").addEventListener("submit", patch);

document.getElementById("toOU").addEventListener("change", () => { document.getElementById("moveButton").disabled = false; });
document.getElementById("moveTo").addEventListener("submit", moveTo);

function toggleUI()
{
	info.hidden = !info.hidden;
	work.hidden = info.hidden;
	tech.hidden = !info.hidden;
	fail();
}

function wait() {
	document.body.style.cursor = 'wait';
	status.title = `waiting on ${CROSBY} reply`;
	status.src = 'assets/yellow_light.png';
}

function fail() {
	console.log('fail');
	document.body.style.cursor = '';
	loadAsset({});
	work.hidden = true;
	let logon = document.getElementById("logon");
	logon.disabled = false;
	status.src = 'assets/red_light.png';
	status.title = `NOT connected to ${CROSBY}`;
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

	let device = document.getElementById('device');
	if (chrome.enterprise) {
		chrome.enterprise.deviceAttributes.getDirectoryDeviceId(deviceId => {
			device.innerText = 'Chrome Enterprise enrollment: ';
			device.innerText += deviceId || 'n/a';
			if (deviceId) {
				fetch(`${CROSBY}device/?id=${deviceId}`, { method: 'GET', headers: headers, mode: 'cors' }).then(function (res) {
					light(res.ok);
					return res.json().then(function (data) {
						device.innerText += ' ' + (data.status || 'unknown');
						loadAsset(data);
					})
				}).catch(function (err) { fail(); })
			}
		});
	}
	else {
		device.innerText = '- THIS DEVICE is NOT enrolled -';
	}
	/*
	chrome.app.window.create(
		'webview.html',
		{ hidden: true, innerBounds: { height:600, width:800 } },   // only show window when webview is configured
		function(appWin) {
		  appWin.contentWindow.addEventListener('DOMContentLoaded',
			function(e) {
			  // when window is loaded, set webview source
			  var webview = appWin.contentWindow.document.querySelector('webview');
			  webview.src = "https://www.google.com";
			  // now we can show it:
			  appWin.show();
			}
		);
	});
	*/
}

function loadOU() {
	//let watch: HTMLOptionsCollection = <any>el
	let el = document.getElementById('toOU');
	wait();
	fetch(`${CROSBY}ou/`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
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
	}).catch(function (err) { fail(); })
}

function loadAsset(data) {
	document.getElementsByName('key')[0].value = data.deviceId || '';
	document.getElementsByName('orgUnitPath')[0].value = data.orgUnitPath || '';
	document.getElementsByName('model')[0].value = data.model || '';
	document.getElementsByName('serialNumber')[0].value = data.serialNumber || '';
	document.getElementsByName('macAddress')[0].value = data.macAddress || '';
	document.getElementsByName('osVersion')[0].value = data.osVersion || '';
	document.getElementsByName('annotatedAssetId')[0].value = data.annotatedAssetId || '';
	document.getElementsByName('annotatedLocation')[0].value = data.annotatedLocation || '';
	document.getElementsByName('annotatedUser')[0].value = data.annotatedUser || '';
	document.getElementsByName('notes')[0].value = data.notes || '';

	let el = document.getElementById('toOU');
	for (let i = 0; i < el.length; i++)
		if (el[i].text == data.orgUnitPath)
			el.selectedIndex = i;

	document.getElementById("patchButton").disabled = true;
	document.getElementById("moveButton").disabled = true;
}

function findAssetBydeviceId() {
	let deviceId = document.getElementsByName("key")[0].value;
	if (deviceId) {
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
	if (serialNumber) {
		wait();
		fetch(`${CROSBY}devices/?id=${serialNumber}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				loadAsset(data);
			})
		}).catch(function (err) { fail(); })
	}
}

function findAssetBymacAddress() {
	let macAddress = document.getElementsByName("macAddress")[0].value.replace(/:/g,'').toLowerCase();
	if (macAddress) {
		wait();
		fetch(`${CROSBY}devices/?wifi_mac=${macAddress}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				loadAsset(data);
			})
		}).catch(function (err) { fail(); })
	}
}

function findAssetByannotatedAssetId() {
	let annotatedAssetId = document.getElementsByName("annotatedAssetId")[0].value;
	if (annotatedAssetId) {
		wait();
		fetch(`${CROSBY}devices/?asset_id=${annotatedAssetId}`, { method: 'GET', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				loadAsset(data);
			})
		}).catch(function (err) { fail(); })
	}
}

function moveTo() {
	let deviceId = document.getElementsByName("key")[0].value;
	let el = document.getElementById('toOU');
	let ou = el[el.selectedIndex].text;	//	.value "fails" if it has a leading "0", go figure
	if (deviceId && ou) {
		wait();
		fetch(`${CROSBY}move/?id=${deviceId}&ou=${ou}`, { method: 'POST', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			findAssetBydeviceId();
		}).catch(function (err) { fail(); })
	}
}

function patch() {
	let deviceId = document.getElementsByName("key")[0].value;
	let annotatedAssetId = document.getElementsByName('annotatedAssetId')[0].value;
	let annotatedLocation = document.getElementsByName('annotatedLocation')[0].value;
	let annotatedUser = document.getElementsByName('annotatedUser')[0].value;
	let notes = document.getElementsByName('notes')[0].value;
	if (deviceId) {
		wait();
		fetch(`${CROSBY}patch/?id=${deviceId}&annotatedAssetId=${annotatedAssetId}&annotatedLocation=${annotatedLocation}&annotatedUser=${annotatedUser}&notes=${notes}`,
		{ method: 'POST', headers: headers, credentials: 'same-origin', mode: 'cors' }).then(function (res) {
			light(res.ok);
			return res.json().then(function (data) {
				findAssetBydeviceId();
			})
		}).catch(function (err) { fail(); })
	}
}
