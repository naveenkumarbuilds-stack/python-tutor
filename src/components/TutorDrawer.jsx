import {useEffect,useRef} from 'react';
import {Chat} from './Chat';
export function TutorDrawer({onClose,...context}){
 const dialog=useRef(null);
 useEffect(()=>{const node=dialog.current;node.showModal();return()=>node.close()},[]);
 return <dialog ref={dialog} className="tutor-dialog" aria-labelledby="tutor-title" onCancel={onClose} onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="tutor-drawer-content"><div className="section-title"><h2 id="tutor-title">Ask about this code</h2><button autoFocus aria-label="Close tutor" onClick={onClose}>Close</button></div><Chat {...context}/></div></dialog>
}
