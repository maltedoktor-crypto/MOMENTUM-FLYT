import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, workerId } = await req.json();

    if (!jobId || !workerId) {
      return Response.json({ error: 'Job ID and Worker ID are required' }, { status: 400 });
    }

    // Get the job
    const jobs = await base44.entities.Job.filter({ id: jobId });
    if (!jobs.length) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];

    // Get the worker
    const workers = await base44.entities.Worker.filter({ id: workerId });
    if (!workers.length) {
      return Response.json({ error: 'Worker not found' }, { status: 404 });
    }

    const worker = workers[0];

    // Check for booking conflicts - worker already assigned to another job at same time
    const conflictingJobs = await base44.entities.Job.filter({
      company_id: job.company_id,
      scheduled_date: job.scheduled_date,
      status: { $nin: ['cancelled', 'completed'] }
    });

    const hasConflict = conflictingJobs.some(otherJob => {
      if (otherJob.id === jobId) return false; // Ignore same job
      
      const jobStart = new Date(`${job.scheduled_date}T${job.start_time}`);
      const jobEnd = new Date(`${job.scheduled_date}T${job.end_time}`);
      const otherStart = new Date(`${otherJob.scheduled_date}T${otherJob.start_time}`);
      const otherEnd = new Date(`${otherJob.scheduled_date}T${otherJob.end_time}`);

      return (otherJob.assigned_workers?.includes(workerId)) && 
             ((jobStart < otherEnd) && (jobEnd > otherStart));
    });

    if (hasConflict) {
      return Response.json({ 
        error: 'Worker is already assigned to another job at this time',
        conflict: true 
      }, { status: 409 });
    }

    // Add worker to job
    const updatedWorkers = [...(job.assigned_workers || []), workerId];
    await base44.entities.Job.update(jobId, {
      assigned_workers: updatedWorkers
    });

    // Send email and SMS notifications to worker
    try {
      await base44.integrations.Core.SendEmail({
        to: worker.email,
        subject: `Ny jobopgave: ${job.customer_name} - ${job.scheduled_date}`,
        body: `Hej ${worker.full_name},\n\nDu er blevet tildelt en jobopgave:\n\nKunde: ${job.customer_name}\nDato: ${job.scheduled_date}\nTidspunkt: ${job.start_time} - ${job.end_time}\n\nFra: ${job.from_address}${job.from_floor ? `, etage ${job.from_floor}` : ''}\nTil: ${job.to_address}${job.to_floor ? `, etage ${job.to_floor}` : ''}\n\nOpslagstekst: ${job.notes || 'Ingen noter'}\n\nMed venlig hilsen,\nMOMENTUM`
      });
    } catch (e) {
      console.error('Failed to send email:', e);
    }

    return Response.json({
      success: true,
      jobId: jobId,
      workerId: workerId,
      message: 'Worker assigned to job successfully'
    });
  } catch (error) {
    console.error('Error assigning worker to job:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});