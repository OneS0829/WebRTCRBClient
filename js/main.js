/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';
var RTCSessionDescription = window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;   
var RTCIceCandidate = window.mozRTCIceCandidate || window.webkitRTCIceCandidate || window.RTCIceCandidate;

var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.onclick = call;
hangupButton.onclick = hangup;
startButton.onclick = start;
callButton.disabled = true;
hangupButton.disabled = true;


var errorElement = document.querySelector('#errorMsg');
var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');
var socket = io('http://192.168.0.241:7777');


var startTime;
var localStream;
var localPeerConnection;
var remotePeerConnection;

var mediaConstraints = {
    "mandatory": {
        "OfferToReceiveAudio": false,
        "OfferToReceiveVideo": true
    }
};

localVideo.addEventListener('loadedmetadata', function() {
  console.trace('Local video videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.addEventListener('loadedmetadata', function() {
  console.trace('Remote video videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

/*
remoteVideo.onresize = function() {
    console.trace('Remote video size changed to ' +
    remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    var elapsedTime = window.performance.now() - startTime;
    console.trace('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
};
*/

function gotStream(stream) {
  console.trace('Received local stream');
  localVideo.srcObject = stream;
  localStream = stream;
  callButton.disabled = false;
}

function start() {
  console.trace('Requesting local stream');
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
        width:{ideal: 1920},
        height:{ideal: 1080}
    }
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

var iceServer = {
    "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
    }]
};

 
function getPeerConnection() {
	if(navigator.userAgent.indexOf("Chrome") != -1 )
	{
	    localPeerConnection = new webkitRTCPeerConnection(iceServer);
	    remotePeerConnection = new webkitRTCPeerConnection(iceServer);
	}             
	else if(navigator.userAgent.indexOf("Firefox") != -1 )
	{
	    localPeerConnection = new mozRTCPeerConnection({"iceServers": [{ "url": "stun:stun.services.mozilla.com" }]});
	    remotePeerConnection = new mozRTCPeerConnection({"iceServers": [{ "url": "stun:stun.services.mozilla.com" }]});
	}
}

function call() {
      callButton.disabled = true;
      hangupButton.disabled = false;          
      getPeerConnection(); 
      remotePeerConnection.onaddstream = gotRemoteStream; 
      localPeerConnection.addStream(localStream);
      localPeerConnection.createOffer(function (sdp) {
      localPeerConnection.setLocalDescription(sdp, function () {
                    socket.emit('offer', sdp); 
                },Error);
       }, function () {
                console.log('create offer error.');
       }, mediaConstraints);
      localPeerConnection.onicecandidate = function (e){
      	   onIceCandidate(localPeerConnection, e);
      }
      localPeerConnection.onaddstream = function (e){
      	   onAddStream(localPeerConnection, e);
      }
}

function onAddStream(pc, event){
	console.log("Stream coming");
}

function onIceCandidate(pc, event){
	if(event != null)
	{
		    console.log("onIceCandidate");
		    /*
			var obj = {
		        "candidate" : event.candidate.candidate,
		        "sdpMLineIndex" : event.candidate.sdpMLineIndex,
		        "sdpMid" : event.candidate.sdpMid
			};
			*/
			socket.emit('candidate', event.candidate);
    }
}



function gotRemoteStream(event) {
	   console.log("Test");
       remoteVideo.src = URL.createObjectURL(event.stream);
}


function gotRemoteIceCandidate(event) {         
         if (!!event.candidate) {
              //socket.emit('candidate', event.candidate);
              console.log("test");
         }
}

/*

socket.on('offer', function (data) {
            remotePeerConnection.onicecandidate = function (e) {
                if (!!e.candidate) {
                    socket.emit('candidate', e.candidate);  
                }
            };
            var offer = new RTCSessionDescription(data.sdp); 
            remotePeerConnection.setRemoteDescription(offer, function () {
            remotePeerConnection.createAnswer(function (sdp) { 
                    remotePeerConnection.setLocalDescription(sdp, function () {
                        socket.emit('answer', sdp); 
                    }, function (e) {
                        console.log('set local description error: ' + e);
                    });
                }, function (e) {
                    console.log('create answer error: ' + e);
                }, mediaConstraints);
            }, function (e) {
                console.log('set remote description error: ' + e);
            });
        });
*/


function hangup() {
            
      localPeerConnection.close();
      remotePeerConnection.close();
      localPeerConnection = null;
      remotePeerConnection = null;
      hangupButton.disabled = true;
      callButton.disabled = false;
}


socket.on('answer', function (data) {
	        console.log(data);
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(data));  
});

      
socket.on('candidate', function (data) {   
	        console.log("Received the candidate");
            console.log(data);
            localPeerConnection.addIceCandidate(data);
});



