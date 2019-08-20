// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// 20-Aug-2019 rhurst
// added storage.managed API to customize
// banner logo & text and control over showing any IPV6
// 05-Apr-2018 rhurst
// BIDMC ITS version uplifted to minimum Chrome version 46.

var runtime = chrome.runtime;
var systemInfo = chrome.system;
var showIPv6 = false;

function insertRow(tableId, cells)
{
  var t = document.getElementById(tableId);
  var r = t.insertRow(t.rows.length);
  for (var i = 0; i < cells.length; i++) {
    var c = r.insertCell(i);
    c.innerHTML = cells[i];
  }
}

function showBounds(bounds) {
  var result = bounds.width + 'x' + bounds.height
  if (bounds.left || bounds.right)
    result += ' (' + bounds.left + ':' + bounds.top + ')';
  return result
}

//  human readable
function bytesToGigaBytes(number) {
  return (Math.round(10 * number / 1024 / 1024 / 1000) / 10) + 'gb';
}

function init() {

  if (runtime) {
    let device = document.getElementById('deviceId');
    if (chrome.enterprise) {
      chrome.enterprise.deviceAttributes.getDirectoryDeviceId(deviceId => {
        device.value = 'Chrome device ID: ';
        device.value += deviceId || '(BYOD - G Suite user)';
        chrome.enterprise.deviceAttributes.getDeviceSerialNumber(sn => {
          device.value += '\nSerial Number: ' + sn;
          chrome.enterprise.deviceAttributes.getDeviceAssetId(assetId => {
            device.value += '\nAsset ID: ' + (assetId || '(empty)');
            chrome.enterprise.deviceAttributes.getDeviceAnnotatedLocation(location => {
              if (location) device.value += ' - ' + location;
            });
          });
        });
      });
      //	fetch any settings associated with the app
      chrome.storage.managed.get(function(policy) {
        if (policy.bannerLogo) document.getElementById('logo').setAttribute('src', `./assets/${policy.bannerLogo}`);
        if (policy.bannerText) document.getElementById('text').innerText = policy.bannerText;
        if (policy.showIPv6) showIPv6 = policy.showIPv6;
      });
    }
    else {
      runtime.getPlatformInfo(function(info) {
        device.value = 'Chrome runtime on ' + info.os + ' ' + info.arch;
        document.getElementById('logo').setAttribute('src', './assets/bilh.png');
        document.getElementById('text').innerText = ' ** \n ** \n ** Developer Mode ** \n ** ';
      });
    }
  }
  else {
    device.innerText = 'not Chrome runtime';
  }

  (function getNetworkInfo() {
    systemInfo.network.getNetworkInterfaces(function(nics) {
      nics.forEach(function(nic, index) {
        if (showIPv6 || !nic.address.includes('::'))
          insertRow('network-table', [ nic.name, nic.address ]);
      });
    });
  })();

  (function getStorageInfo() {
    systemInfo.storage.getInfo(function(units) {
      var t = document.getElementById('storage-table');
      while (t.rows.length > 2)
        t.deleteRow(2);
      units.forEach(function(unit, index) {
  /***  DEV channel only
          systemInfo.storage.getAvailableCapacity(unit.id, function(info) {
            console.log(info);
            unit.availableCapacity = info.availableCapacity;
            table += showStorageInfo(unit);
          })
  ***/
        // unit.id is not a friendly attribute to display
        insertRow('storage-table', [
          index, unit.type, bytesToGigaBytes(unit.capacity)
        ]);
      });
    });

    systemInfo.storage.onAttached.addListener(getStorageInfo);
    systemInfo.storage.onDetached.addListener(getStorageInfo);
  })();

  (function getMemoryInfo() {
    systemInfo.memory.getInfo(function(memory) {
      var t = document.getElementById('memory-table');
      t.rows[2].cells[0].innerHTML = bytesToGigaBytes(memory.availableCapacity);
      t.rows[2].cells[1].innerHTML = bytesToGigaBytes(memory.capacity);
    });

    setTimeout(getMemoryInfo, 5000);
  })();

  (function getCpuInfo() {
    systemInfo.cpu.getInfo(function(cpu) {
      var t = document.getElementById('cpu-table');
      t.rows[1].cells[0].innerHTML = 
        '<b>Model Name: </b>' + cpu.modelName + ' (' + cpu.archName + ')<br>' +
        '<b>Features: </b>' + cpu.features.join(' ');
      cpu.processors.forEach(function(processor, index) {
        if (index + 3 == t.rows.length) {
          var r = t.insertRow();
          for (var i = 0; i < 5; i++)
            r.insertCell();
        }
        t.rows[index + 3].cells[0].innerHTML = index;
        t.rows[index + 3].cells[1].innerHTML = processor.usage.idle;
        t.rows[index + 3].cells[2].innerHTML = processor.usage.kernel;
        t.rows[index + 3].cells[3].innerHTML = processor.usage.user;
        t.rows[index + 3].cells[4].innerHTML = processor.usage.total;
      });
    });
    setTimeout(getCpuInfo, 2000);
  })();

  (function getDisplayInfo() {
    systemInfo.display.getInfo(function(displays) {
      var t = document.getElementById('display-table');
      displays.forEach(function(display, index) {
        if (index + 2 == t.rows.length) {
          var r = t.insertRow();
          for (var i = 0; i < 8; i++)
            r.insertCell();
        }
        t.rows[index + 2].cells[0].innerHTML = index;
        t.rows[index + 2].cells[1].innerHTML = display.name;
        t.rows[index + 2].cells[2].innerHTML = display.mirroringSourceId;
        t.rows[index + 2].cells[3].innerHTML = display.isPrimary;
        t.rows[index + 2].cells[4].innerHTML = display.isInternal;
        t.rows[index + 2].cells[5].innerHTML = display.isEnabled;
        t.rows[index + 2].cells[6].innerHTML = showBounds(display.workArea)
          + (display.rotation ? ' (rotated)' : '');
        t.rows[index + 2].cells[7].innerHTML = Math.round(display.dpiX) + ':' + Math.round(display.dpiY);
      /*
        showBounds(display.bounds)
        showInsets(display.overscan)
      */
      });
    });

    systemInfo.display.onDisplayChanged.addListener(getDisplayInfo);
  })();
}

document.addEventListener('DOMContentLoaded', init);
