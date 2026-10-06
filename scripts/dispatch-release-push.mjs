import {dispatchRelease} from '../lib/notifications/deployment-dispatch.mjs';
const result=await dispatchRelease({base:process.env.LAKBAY_PRODUCTION_URL,secret:process.env.CRON_SECRET,expected:process.env.GITHUB_SHA});
console.log('Release push sweep completed:',JSON.stringify(result));
