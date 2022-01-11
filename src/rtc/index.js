var constraints = { audio: true, video: { width: 1280, height: 720 } };
export default class Call {
  pc;
  constructor(username = '1') {
    this.name = username;
    // new WebSocket('ws://localhost:1234');
  }

  init (videoEl) {
    this.videoEl = videoEl;
    this.createPeerConnect();
    this.createWs();
  }

  createWs () {
    console.log('create ws')
    if (!this.ws) {
      this.ws = new WebSocket('ws://localhost:1234');
      this.ws.onmessage = this.handleWsMsg.bind(this);
      this.ws.onopen = () => {
        this.sendMsg({
          type: 'new-user',
          name: this.name
        })
      }
    }
  }

  createPeerConnect() {
    this.pc = new RTCPeerConnection();
    this.pc.onicecandidate = this.handleOnicecandidate.bind(this);
    this.pc.ontrack = this.handleOntrack.bind(this);
    this.pc.onconnectionstatechange = this.handleConnectionStateChange.bind(this);
    this.pc.oniceconnectionstatechange = this.handleICEConnectionStateChange.bind(this)
    this.pc.onnegotiationneeded = this.handleNegotiationNeeded.bind(this);
    this.pc.onsignalingstatechange = this.handleSignalingStateChangeEvent.bind(this);
    this.pc.onicegatheringstatechange = this.handleICEGatheringStateChange.bind(this);
  }

  // todo 这一步干啥的
  handleOnicecandidate(e) {
    if (e.candidate) {
      this.sendMsg({
        type: 'new-ice-candidate',
        name: this.name,
        sdp: e.candidate
      })
    }
    console.log('handleOnicecandidate', e.candidate)
  }

  handleOntrack(e) {
    console.log('handleOntrack', e)
    const el = document.querySelector('video')
    console.log('render video', e.streams[0])
    el.srcObject = e.streams[0];
  }

  handleNegotiationNeeded(e) {
    console.log('handleNegotiationNeeded', e)
    this.sendOffer();
    if (!this.hasSend) {
      this.sendOffer();
      this.hasSend = true;
    }
  }

  handleConnectionStateChange(e) {
    console.log('handleConnectionStateChange', this.pc.connectionState)
  }

  handleICEConnectionStateChange(e) {
    console.log('handleICEConnectionStateChangeEvent', this.pc.iceConnectionState)
  }

  handleICEGatheringStateChange(e) {
    console.log('handleICEGatheringStateChangeEvent', this.pc.iceGatheringState)
  }

  handleSignalingStateChangeEvent(e) {
    console.log('handleSignalingStateChangeEvent', e)
  }
  
  async sendOffer () {
    const offer = await this.pc.createOffer();
    console.log('offer', offer);
    await this.pc.setLocalDescription(offer);
    console.log('send', this.pc.localDescription)
    this.sendMsg({
      name: this.name,
      type: 'video-offer',
      sdp: this.pc.localDescription,
    })
  }

  async handleWsMsg (msg) {
    console.log(msg)
    try {
      const data = JSON.parse(msg.data);
      console.log(msg.type)
      if (data.type === 'video-offer') {
        this.handleGetOffer(data)
      } else if (data.type === 'video-answer') {
        this.handleAnswer(data);
      } else if (data.type === 'new-ice-candidate') {
        this.handleNewIce(data);
      }
    } catch(e) {

    }
  }

  async handleAnswer({ name, sdp }) {
    const desc = new RTCSessionDescription(sdp);
    await this.pc.setRemoteDescription(desc);
  }

  async handleGetOffer ({ name, sdp }) {
    console.log('state', this.pc.signalingState)
    if (this.pc.signalingState != "stable") {
      await Promise.all([
        this.pc.setLocalDescription({type: "rollback"}),
        this.pc.setRemoteDescription(sdp)
      ]);
    } else {
      await this.pc.setRemoteDescription(sdp)
    }
    await this.start();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.sendMsg({
      name: this.name,
      type: 'video-answer',
      sdp: this.pc.localDescription
    })
  }

  async handleNewIce({ name, sdp }) {
    const candidate = new RTCIceCandidate(sdp);
    await this.pc.addIceCandidate(candidate)
  }

  async sendMsg (msg) {
    this.ws.send(JSON.stringify(msg));
  }

  async start() {
    if (!this.hasAppendTrack) {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // stream.getTracks().forEach(track => this.pc.addTrack(track, stream))
      stream.getTracks().forEach(track => this.pc.addTransceiver(track, {streams: [stream]}))
      // this.pc.addStream(stream)
      this.hasAppendTrack = true;
    }
  }
}