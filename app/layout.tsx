import type {Metadata} from 'next';
import './globals.css';
import Splash from '@/components/lakbay/splash';
export const metadata:Metadata={title:'Lakbay | Every ride counts',description:'Plan your route, find fuel and repair shops, check route weather, and save your rides with Lakbay.',manifest:'/manifest.webmanifest',themeColor:'#244f3f',icons:{icon:[{url:'/icons/lakbay-192.png',sizes:'192x192',type:'image/png'},{url:'/icons/lakbay-512.png',sizes:'512x512',type:'image/png'}],apple:'/icons/lakbay-192.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><Splash>{children}</Splash></body></html>}
