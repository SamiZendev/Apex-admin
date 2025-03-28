export interface GHLSubaccountAuth {
    id?: string;
    ghl_location_id: string;
    access_token: string;
    refresh_token: string;
    expires_in: string;
    created_at?: string;
    updated_at?: string;
    ghl_company_id: string;
    account_type: string;
    is_active: boolean;
  }
  
export interface RefreshAuthResponse {
    success: boolean;
    data?: GHLSubaccountAuth[];
    message?: string;
    error?: object;
  }
  