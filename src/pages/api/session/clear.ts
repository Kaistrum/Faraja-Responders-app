import type { NextApiRequest, NextApiResponse } from "next";

// There's no logout endpoint on the RAPIDA backend (confirmed absent from
// its schema), so this only clears the browser's copy of the Django
// "sessionid" cookie (set earlier via the /api/proxy/* rewrite during login).
// It does not invalidate the session server-side.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
	res.setHeader("Set-Cookie", "sessionid=; Path=/; Max-Age=0");
	res.status(204).end();
}
