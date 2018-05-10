// BIDMC ITS: Who Am I for Field and Support teams
//
// 10-May-2018 rhurst
// staging milestone: v1.1.0
// 03-May-2018 rhurst
// IC "new & deploy" workflow
// 19-Apr-2018 rhurst
// draft

//const CROSBY = 'https://rhurst-laptop.bidmc.harvard.edu:3333/crosby/'
const CROSBY = 'https://cassiopeia.bidmc.harvard.edu/crosby/'

let info = document.getElementById("info");
let tech = document.getElementById("tech");
let work = document.getElementById("work");

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
}

function authorize()
{
	work.hidden = false;
	loadOU();

	let device = document.getElementById('device');
	if (chrome.enterprise) {
		chrome.enterprise.deviceAttributes.getDirectoryDeviceId(deviceId => {
			device.innerText = 'Chrome managed device ID: ';
			device.innerText += deviceId || '(empty)';
			if (deviceId) {
				fetch(`${CROSBY}device/?id=${deviceId}`, { method: 'GET', mode: 'cors' }).then(function (res) {
					return res.json().then(function (data) {
						loadAsset(data);
					})
				})
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

// TODO: headers: { Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64') },
function loadOU() {
	//let watch: HTMLOptionsCollection = <any>el
	let el = document.getElementById('toOU');
	fetch(`${CROSBY}ou/`, { method: 'GET', mode: 'cors' }).then(function (res) {
		return res.json().then(function (data) {
			for (let i in data) {
				let option = document.createElement("option");
				option.text = data[i].key;
				option.value = data[i].value;
				el.add(option);
			}
			el.selectedIndex = -1;
		})
	})
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
		fetch(`${CROSBY}device/?id=${deviceId}`, { method: 'GET', mode: 'cors' }).then(function (res) {
			return res.json().then(function (data) {
				loadAsset(data);
			})
		})
	}
}

function findAssetByserialNumber() {
	let serialNumber = document.getElementsByName("serialNumber")[0].value;
	if (serialNumber) {
		fetch(`${CROSBY}devices/?id=${serialNumber}`, { method: 'GET', mode: 'cors' }).then(function (res) {
			return res.json().then(function (data) {
				loadAsset(data);
			})
		})
	}
}

function findAssetBymacAddress() {
	let macAddress = document.getElementsByName("macAddress")[0].value.replace(/:/g,'');
	if (macAddress) {
		fetch(`${CROSBY}devices/?wifi_mac=${macAddress}`, { method: 'GET', mode: 'cors' }).then(function (res) {
			return res.json().then(function (data) {
				loadAsset(data);
			})
		})
	}
}

function findAssetByannotatedAssetId() {
	let annotatedAssetId = document.getElementsByName("annotatedAssetId")[0].value;
	if (annotatedAssetId) {
		fetch(`${CROSBY}devices/?asset_id=${annotatedAssetId}`, { method: 'GET', mode: 'cors' }).then(function (res) {
			return res.json().then(function (data) {
				loadAsset(data);
			})
		})
	}
}

function moveTo() {
	let deviceId = document.getElementsByName("key")[0].value;
	let el = document.getElementById('toOU');
	let ou = el[el.selectedIndex].text;	//	.value "fails" if it has a leading "0", go figure
	if (deviceId && ou) {
		fetch(`${CROSBY}move/?id=${deviceId}&ou=${ou}`, { method: 'POST', mode: 'cors' }).then(function (res) {
			return res.json().then(function (data) {
				findAssetBydeviceId();
			})
		})
	}
}

function patch() {
	let deviceId = document.getElementsByName("key")[0].value;
	let annotatedAssetId = document.getElementsByName('annotatedAssetId')[0].value;
	let annotatedLocation = document.getElementsByName('annotatedLocation')[0].value;
	let annotatedUser = document.getElementsByName('annotatedUser')[0].value;
	let notes = document.getElementsByName('notes')[0].value;
	if (deviceId) {
		fetch(`${CROSBY}patch/?id=${deviceId}&annotatedAssetId=${annotatedAssetId}&annotatedLocation=${annotatedLocation}&annotatedUser=${annotatedUser}&notes=${notes}`,
		{ method: 'POST', mode: 'cors' }).then(function (res) {
			return res.json().then(function (data) {
				findAssetBydeviceId();
			})
		})
	}
}
