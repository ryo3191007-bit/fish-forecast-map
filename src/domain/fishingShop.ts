export type FishingShopSource = { label: string; url: string };

export type FishingShop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  checkedAt: string;
  source: FishingShopSource;
  address?: string;
  officialUrl?: string;
  phone?: string;
  openingHours?: string;
  openingHoursCheckedAt?: string;
};
