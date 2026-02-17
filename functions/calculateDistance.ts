import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { from_address, to_address, company_address } = await req.json();

    if (!from_address || !to_address) {
      return Response.json({ error: 'Missing addresses' }, { status: 400 });
    }

    const geocodeWithRetry = async (address, retries = 3) => {
      for (let i = 0; i <= retries; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 300 + i * 600));
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
          const res = await fetch(url, { 
            headers: { 'User-Agent': 'MovingApp/1.0' },
            signal: AbortSignal.timeout(8000)
          });
          const data = await res.json();
          if (!data || data.length === 0) throw new Error('Address not found');
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        } catch (e) {
          if (i === retries) throw e;
          await new Promise(resolve => setTimeout(resolve, 500 + i * 500));
        }
      }
    };

    const getRouteDistance = async (coords, retries = 2) => {
      for (let i = 0; i <= retries; i++) {
        try {
          const coordString = coords.map(c => `${c.lon},${c.lat}`).join(';');
          const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          const data = await res.json();
          if (data.code !== 'Ok') throw new Error('Routing unavailable');
          if (!data.routes || data.routes.length === 0) throw new Error('No route found');
          return data.routes[0].distance / 1000;
        } catch (e) {
          if (i === retries) throw e;
          await new Promise(resolve => setTimeout(resolve, 800 + i * 600));
        }
      }
    };

    const companyCoords = company_address || { lat: 56.4617, lon: 10.0371 };

    const fromCoords = await geocodeWithRetry(from_address);
    const toCoords = await geocodeWithRetry(to_address);

    const [fromCompanyToStart, startToEnd, endToCompanyReturn] = await Promise.all([
      getRouteDistance([companyCoords, fromCoords]),
      getRouteDistance([fromCoords, toCoords]),
      getRouteDistance([toCoords, companyCoords])
    ]);

    const total = fromCompanyToStart + startToEnd + endToCompanyReturn;

    return Response.json({
      total: Math.round(total * 10) / 10,
      fromCompanyToStart: Math.round(fromCompanyToStart * 10) / 10,
      startToEnd: Math.round(startToEnd * 10) / 10,
      endToCompanyReturn: Math.round(endToCompanyReturn * 10) / 10,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});