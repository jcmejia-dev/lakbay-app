import type {Metadata,Viewport} from 'next';
import './globals.css';
import Splash from '@/components/lakbay/splash';
import AppBehavior from '@/components/lakbay/app-behavior';
export const metadata:Metadata={title:'Lakbay | Every ride counts',description:'Plan your route, find fuel and repair shops, check route weather, and save your rides with Lakbay.',manifest:'/manifest.webmanifest',icons:{icon:[{url:'/icons/lakbay-192.png',sizes:'192x192',type:'image/png'},{url:'/icons/lakbay-512.png',sizes:'512x512',type:'image/png'}],apple:'/icons/lakbay-192.png'}};
export const viewport:Viewport={themeColor:'#244f3f'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><Splash><AppBehavior/>{children}</Splash></body></html>}
