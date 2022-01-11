import { useEffect, useRef } from 'react';
import Call from './rtc/index.js'

export default () => {
  const videoRef = useRef();
  const name = Math.floor(Math.random() * 10000000)
  const rtcRef = useRef(new Call(name));

  console.log(rtcRef)
  window.ref = rtcRef
  useEffect(() => {
    if (rtcRef.current) {
      console.log(videoRef)
      rtcRef.current.init(videoRef.current)
      console.log('init')
      
      // rtcRef.current.start()
    }
  }, [])

  return videoRef;
}