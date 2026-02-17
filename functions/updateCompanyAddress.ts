import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.company_id) {
      return Response.json({ error: 'Bruger eller virksomhed ikke fundet' }, { status: 401 });
    }

    const address = 'Skaldehøjvej 32, 8800 Viborg, Danmark';

    // Geocode the address
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=dk&limit=1`;
    const geoRes = await fetch(geocodeUrl, { headers: { 'User-Agent': 'MovingApp/1.0' } });
    const geoData = await geoRes.json();

    if (!geoData.length) {
      return Response.json({ error: 'Adresse ikke fundet' }, { status: 400 });
    }

    const coordinates = {
      lat: parseFloat(geoData[0].lat),
      lon: parseFloat(geoData[0].lon)
    };

    // Update company
    await base44.entities.Company.update(user.company_id, {
      address_coordinates: coordinates
    });

    return Response.json({ success: true, coordinates });
  } catch (error) {
    console.error('Update address error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});