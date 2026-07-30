export interface PlacementEvent {
  id: string;
  companyName: string;
  role: string;
  ctc?: string;
  status: 'applied' | 'test' | 'interview' | 'offered' | 'rejected' | 'wishlist';
  eventType: 'application_deadline' | 'online_test' | 'interview' | 'other';
  eventDate: string; // YYYY-MM-DD
  eventTime?: string; // HH:MM
  notes?: string;
  link?: string; // Job link
}
