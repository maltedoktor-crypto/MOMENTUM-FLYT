import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    console.log('Sync job to Google Calendar:', event, data);

    // Skip if job doesn't have required data
    if (!data?.scheduled_date || !data?.customer_name) {
      console.log('Skipping - missing required fields');
      return Response.json({ success: true, skipped: true });
    }

    // Get access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    
    // Prepare event data
    const startDateTime = `${data.scheduled_date}T${data.start_time || '09:00'}:00`;
    const endDateTime = data.end_time 
      ? `${data.scheduled_date}T${data.end_time}:00`
      : `${data.scheduled_date}T17:00:00`;

    const calendarEvent = {
      summary: `Flytning: ${data.customer_name}`,
      description: `Job #${data.job_number}\n\nKunde: ${data.customer_name}\nFra: ${data.from_address}\nTil: ${data.to_address}\n\nStatus: ${data.status}\nTeam: ${data.crew_size || 'ikke tildelt'} personer\n\n${data.notes || ''}`,
      start: {
        dateTime: startDateTime,
        timeZone: 'Europe/Copenhagen'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Europe/Copenhagen'
      },
      location: data.from_address,
      colorId: data.status === 'completed' ? '10' : data.status === 'cancelled' ? '11' : '9'
    };

    let response;
    
    if (event.type === 'delete' && data.google_calendar_event_id) {
      // Delete event from Google Calendar
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.google_calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );
      console.log('Deleted calendar event:', response.status);
      
    } else if (data.google_calendar_event_id) {
      // Update existing event
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.google_calendar_event_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(calendarEvent)
        }
      );
      
      const result = await response.json();
      console.log('Updated calendar event:', result.id);
      
    } else {
      // Create new event
      response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(calendarEvent)
        }
      );
      
      const result = await response.json();
      console.log('Created calendar event:', result.id);
      
      // Update job with calendar event ID
      await base44.asServiceRole.entities.Job.update(data.id, {
        google_calendar_event_id: result.id
      });
    }

    return Response.json({ 
      success: true,
      action: event.type,
      jobId: data.id
    });
    
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});