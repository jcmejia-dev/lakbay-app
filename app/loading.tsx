import Brand from '@/components/lakbay/brand';

// Stream the Lakbay title while account/Neon data is loading, rather than
// leaving the browser waiting for the entire authenticated page response.
export default function Loading() {
  return <div className="launch-wait" role="status" aria-label="Opening Lakbay"><Brand/></div>;
}
