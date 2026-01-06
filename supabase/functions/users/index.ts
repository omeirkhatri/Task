import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, createErrorResponse } from "../_shared/utils.ts";

async function updateSaleDisabled(user_id: string, disabled: boolean) {
  const { error } = await supabaseAdmin
    .from("sales")
    .update({ disabled: disabled ?? false })
    .eq("user_id", user_id);
  
  if (error) {
    console.error("Error updating sale disabled status:", error);
    throw error;
  }
}

async function updateSaleAdministrator(
  user_id: string,
  administrator: boolean,
) {
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .update({ administrator })
    .eq("user_id", user_id)
    .select("*");

  if (!sales?.length || salesError) {
    console.error("Error updating user:", salesError);
    throw salesError ?? new Error("Failed to update sale");
  }
  return sales.at(0);
}

async function updateSaleAvatar(user_id: string, avatar: string) {
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .update({ avatar })
    .eq("user_id", user_id)
    .select("*");

  if (!sales?.length || salesError) {
    console.error("Error updating user:", salesError);
    throw salesError ?? new Error("Failed to update sale");
  }
  return sales.at(0);
}

async function inviteUser(req: Request, currentUserSale: any) {
  let email, password, first_name, last_name, disabled, administrator, avatar;
  
  try {
    const body = await req.json();
    console.log("inviteUser received body:", JSON.stringify(body));
    email = body.email;
    password = body.password;
    first_name = body.first_name;
    last_name = body.last_name;
    disabled = body.disabled;
    administrator = body.administrator;
    avatar = body.avatar;
  } catch (e) {
    console.error("Error parsing request body:", e);
    return createErrorResponse(400, `Invalid request body: ${e instanceof Error ? e.message : "Unknown error"}`);
  }
  
  if (!email || !first_name || !last_name) {
    console.error("Missing required fields:", { email, first_name, last_name });
    return createErrorResponse(400, "Missing required fields: email, first_name, and last_name are required");
  }

  if (!currentUserSale.administrator) {
    console.error("User is not administrator:", currentUserSale);
    return createErrorResponse(401, "Not Authorized");
  }
  
  console.log("Creating user with data:", { email, first_name, last_name, disabled, administrator });

  const passwordProvided =
    typeof password === "string" && password.trim().length > 0;

  const { data, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    ...(passwordProvided ? { password } : {}),
    // If we set the password directly, confirm the email so the user can sign in immediately.
    ...(passwordProvided ? { email_confirm: true } : {}),
    // Keep auth ban status in sync with the sales.disabled flag.
    ban_duration: disabled ? "87600h" : "none",
    user_metadata: { first_name, last_name },
  });

  if (!data?.user || userError) {
    console.error(`Error creating user: user_error=`, userError);
    const errorMsg = userError?.message || "Failed to create user";
    return createErrorResponse(500, `Internal Server Error: ${errorMsg}`);
  }
  
  console.log("User created successfully:", data.user.id);

  // Only send an invite email when no password was provided.
  // If a password is set, admins can share credentials out-of-band.
  if (!passwordProvided) {
    const { error: emailError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (emailError) {
      console.error(`Error inviting user, email_error=${emailError}`);
      return createErrorResponse(500, "Failed to send invitation mail");
    }
  }

  // Wait for the trigger to create the sales record, with retries
  let sale = null;
  let retries = 5;
  while (retries > 0 && !sale) {
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    if (salesData && !salesError) {
      sale = salesData;
      break;
    }

    // Wait 200ms before retrying
    await new Promise((resolve) => setTimeout(resolve, 200));
    retries--;
  }

  // If sales record still doesn't exist, create it manually
  if (!sale) {
    const { data: newSale, error: createError } = await supabaseAdmin
      .from("sales")
      .insert({
        user_id: data.user.id,
        email,
        first_name,
        last_name,
        administrator: administrator ?? false,
        disabled: disabled ?? false,
        ...(avatar ? { avatar } : {}),
      })
      .select("*")
      .single();

    if (!newSale || createError) {
      console.error(`Error creating sales record:`, createError);
      const errorMsg = createError?.message || "Unknown error";
      return createErrorResponse(500, `Failed to create sales record: ${errorMsg}`);
    }
    sale = newSale;
    console.log("Sales record created manually:", sale.id);
  } else {
    console.log("Sales record found from trigger:", sale.id);
  }

  try {
    // Update the sales record with the correct disabled, administrator, and avatar flags in a single operation
    const updateData: any = {
      disabled: disabled ?? false,
      administrator: administrator ?? false,
    };
    
    if (avatar) {
      updateData.avatar = avatar;
    }

    const { data: updatedSale, error: updateError } = await supabaseAdmin
      .from("sales")
      .update(updateData)
      .eq("user_id", data.user.id)
      .select("*")
      .single();

    if (updateError || !updatedSale) {
      console.error("Error updating sale:", updateError);
      const errorMsg = updateError?.message || "Unknown error";
      return createErrorResponse(500, `Failed to update sales record: ${errorMsg}`);
    }

    console.log("User creation completed successfully:", updatedSale.id);
    return new Response(
      JSON.stringify({
        data: updatedSale,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (e) {
    console.error("Error patching sale:", e);
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("Error stack:", e instanceof Error ? e.stack : "No stack trace");
    return createErrorResponse(500, `Internal Server Error: ${errorMsg}`);
  }
}

async function patchUser(req: Request, currentUserSale: any) {
  const {
    sales_id,
    email,
    first_name,
    last_name,
    avatar,
    administrator,
    disabled,
  } = await req.json();
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("*")
    .eq("id", sales_id)
    .single();

  if (!sale) {
    return createErrorResponse(404, "Not Found");
  }

  // Users can only update their own profile unless they are an administrator
  if (!currentUserSale.administrator && currentUserSale.id !== sale.id) {
    return createErrorResponse(401, "Not Authorized");
  }

  const { data, error: userError } =
    await supabaseAdmin.auth.admin.updateUserById(sale.user_id, {
      email,
      ban_duration: disabled ? "87600h" : "none",
      user_metadata: { first_name, last_name },
    });

  if (!data?.user || userError) {
    console.error("Error patching user:", userError);
    return createErrorResponse(500, "Internal Server Error");
  }

  if (avatar) {
    await updateSaleAvatar(data.user.id, avatar);
  }

  // Only administrators can update the administrator and disabled status
  if (!currentUserSale.administrator) {
    const { data: new_sale } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("id", sales_id)
      .single();
    return new Response(
      JSON.stringify({
        data: new_sale,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  try {
    await updateSaleDisabled(data.user.id, disabled);
    const sale = await updateSaleAdministrator(data.user.id, administrator);
    return new Response(
      JSON.stringify({
        data: sale,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (e) {
    console.error("Error patching sale:", e);
    return createErrorResponse(500, "Internal Server Error");
  }
}

async function deleteUser(req: Request, currentUserSale: any) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error("Error parsing request body:", jsonError);
      return createErrorResponse(400, "Invalid request body");
    }

    const { sales_id } = body;

    if (!sales_id) {
      return createErrorResponse(400, "sales_id is required");
    }

    if (!currentUserSale.administrator) {
      return createErrorResponse(401, "Not Authorized");
    }

    // Prevent self-deletion
    if (currentUserSale.id === sales_id) {
      return createErrorResponse(400, "Cannot delete your own account");
    }

    // Get the sale record to find the user_id
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("id", sales_id)
      .single();

    if (!sale || saleError) {
      console.error("Error fetching sale:", saleError);
      return createErrorResponse(404, "User not found");
    }

    // Delete the auth user (this requires admin privileges)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      sale.user_id,
    );

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return createErrorResponse(500, `Failed to delete user: ${deleteError.message || "Unknown error"}`);
    }

    // The sales record should be automatically deleted via cascade or trigger
    // But let's also delete it explicitly to be sure
    const { error: salesDeleteError } = await supabaseAdmin
      .from("sales")
      .delete()
      .eq("id", sales_id);

    if (salesDeleteError) {
      console.error("Error deleting sales record:", salesDeleteError);
      // Don't fail if sales record deletion fails - auth user is already deleted
    }

    return new Response(
      JSON.stringify({
        message: "User deleted successfully",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        status: 200,
      },
    );
  } catch (e) {
    console.error("Unexpected error in deleteUser:", e);
    return createErrorResponse(500, `Internal server error: ${e instanceof Error ? e.message : "Unknown error"}`);
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse(401, "Authorization header required");
    }

    const localClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data } = await localClient.auth.getUser();
    if (!data?.user) {
      return createErrorResponse(401, "Unauthorized");
    }
    const currentUserSale = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    if (!currentUserSale?.data) {
      return createErrorResponse(401, "Unauthorized");
    }
    if (req.method === "POST") {
      return inviteUser(req, currentUserSale.data);
    }

    if (req.method === "PATCH") {
      return patchUser(req, currentUserSale.data);
    }

    if (req.method === "DELETE") {
      return deleteUser(req, currentUserSale.data);
    }

    return createErrorResponse(405, "Method Not Allowed");
  } catch (e) {
    console.error("Unexpected error in Edge Function:", e);
    return createErrorResponse(500, `Internal server error: ${e instanceof Error ? e.message : "Unknown error"}`);
  }
});
