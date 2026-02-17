import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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

    // Get Momentum company (first company)
    const companies = await base44.asServiceRole.entities.Company.list();
    const momentum = companies[0];

    if (!momentum) {
      return Response.json({ error: 'Momentum virksomhed ikke fundet' }, { status: 400 });
    }

    // Update Momentum with address coordinates
    await base44.asServiceRole.entities.Company.update(momentum.id, {
      address_coordinates: coordinates
    });

    return Response.json({ success: true, coordinates, companyId: momentum.id });
  } catch (error) {
    console.error('Set address error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});