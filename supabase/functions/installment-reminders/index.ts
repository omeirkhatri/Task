// Supabase Edge Function for sending installment reminders
// This function finds installments due in 3 days and sends reminders
// Can be called via cron job or manually

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  // Only allow POST requests (for cron jobs) or GET (for manual testing)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Calculate date 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysFromNowStr = threeDaysFromNow.toISOString().split("T")[0];

    // Find installments due in 3 days that haven't been paid and haven't had reminders sent
    const { data: installments, error: fetchError } = await supabaseAdmin
      .from("installment_schedules")
      .select(`
        *,
        payment_packages!inner(
          id,
          patient_id,
          total_amount,
          contacts:patient_id(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq("is_paid", false)
      .eq("reminder_sent", false)
      .eq("due_date", threeDaysFromNowStr);

    if (fetchError) {
      console.error("Error fetching installments:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch installments", details: fetchError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!installments || installments.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No installments due in 3 days",
          count: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Process each installment
    const results = [];
    for (const installment of installments) {
      const packageData = installment.payment_packages;
      const contact = packageData?.contacts;

      try {
        // TODO: Send actual email/SMS reminder here
        // For now, we'll just log and update the reminder_sent flag
        console.log(`Sending reminder for installment ${installment.installment_number} of package ${packageData?.id}`);
        console.log(`Contact: ${contact?.first_name} ${contact?.last_name} (${contact?.email})`);
        console.log(`Amount due: AED ${installment.amount_due}`);
        console.log(`Due date: ${installment.due_date}`);

        // Update reminder_sent flag
        const { error: updateError } = await supabaseAdmin
          .from("installment_schedules")
          .update({ reminder_sent: true })
          .eq("id", installment.id);

        if (updateError) {
          console.error(`Error updating reminder_sent for installment ${installment.id}:`, updateError);
          results.push({
            installment_id: installment.id,
            package_id: packageData?.id,
            status: "error",
            error: updateError.message,
          });
        } else {
          results.push({
            installment_id: installment.id,
            package_id: packageData?.id,
            contact_name: `${contact?.first_name} ${contact?.last_name}`,
            contact_email: contact?.email,
            amount_due: installment.amount_due,
            due_date: installment.due_date,
            status: "reminder_sent",
          });
        }
      } catch (error) {
        console.error(`Error processing installment ${installment.id}:`, error);
        results.push({
          installment_id: installment.id,
          package_id: packageData?.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${installments.length} installment reminder(s)`,
        count: installments.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/* To invoke locally:
  1. Run `make start`
  2. In another terminal, run `make start-supabase-functions`
  3. Make an HTTP request:
  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/installment-reminders' \
    --header 'Authorization: Bearer YOUR_ANON_KEY'
*/

