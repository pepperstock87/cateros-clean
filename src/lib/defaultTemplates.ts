export type DefaultTemplate = {
  name: string;
  description: string;
  template_data: {
    guest_count: number;
    event_type: string;
    pricing_data: {
      menuItems: { name: string; costPerUnit: number; quantity: number }[];
      staffing: { role: string; hourlyRate: number; hours: number; count: number }[];
      rentals: { name: string; unitCost: number; quantity: number }[];
      barPackage: string;
      adminPercent: number;
      taxPercent: number;
      targetMargin: number;
    };
  };
};

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Wedding Reception",
    description: "Full-service wedding reception with plated dinner",
    template_data: {
      guest_count: 150,
      event_type: "wedding",
      pricing_data: {
        menuItems: [
          { name: "Passed Appetizers (3 selections)", costPerUnit: 8, quantity: 150 },
          { name: "Plated Dinner (choice of 2)", costPerUnit: 45, quantity: 150 },
          { name: "Wedding Cake Service", costPerUnit: 5, quantity: 150 },
        ],
        staffing: [
          { role: "Server", hourlyRate: 25, hours: 8, count: 8 },
          { role: "Head Chef", hourlyRate: 35, hours: 10, count: 1 },
          { role: "Sous Chef", hourlyRate: 28, hours: 10, count: 2 },
          { role: "Bartender", hourlyRate: 25, hours: 6, count: 2 },
        ],
        rentals: [
          { name: "Dinner Plates", unitCost: 1.5, quantity: 150 },
          { name: "Glassware Set", unitCost: 2, quantity: 150 },
        ],
        barPackage: "full",
        adminPercent: 20,
        taxPercent: 8.875,
        targetMargin: 35,
      },
    },
  },
  {
    name: "Corporate Lunch",
    description: "Business lunch or corporate meeting catering",
    template_data: {
      guest_count: 50,
      event_type: "corporate",
      pricing_data: {
        menuItems: [
          { name: "Buffet Lunch Spread", costPerUnit: 22, quantity: 50 },
          { name: "Beverages & Coffee Service", costPerUnit: 5, quantity: 50 },
        ],
        staffing: [
          { role: "Server", hourlyRate: 25, hours: 4, count: 2 },
          { role: "Chef", hourlyRate: 30, hours: 5, count: 1 },
        ],
        rentals: [],
        barPackage: "none",
        adminPercent: 18,
        taxPercent: 8.875,
        targetMargin: 30,
      },
    },
  },
  {
    name: "Cocktail Reception",
    description: "Standing cocktail party with passed hors d'oeuvres",
    template_data: {
      guest_count: 100,
      event_type: "cocktail",
      pricing_data: {
        menuItems: [
          { name: "Passed Hors d'oeuvres (5 selections)", costPerUnit: 15, quantity: 100 },
          { name: "Cheese & Charcuterie Display", costPerUnit: 8, quantity: 100 },
        ],
        staffing: [
          { role: "Server", hourlyRate: 25, hours: 5, count: 4 },
          { role: "Bartender", hourlyRate: 25, hours: 5, count: 3 },
          { role: "Chef", hourlyRate: 30, hours: 6, count: 1 },
        ],
        rentals: [
          { name: "Cocktail Tables", unitCost: 15, quantity: 10 },
        ],
        barPackage: "full",
        adminPercent: 20,
        taxPercent: 8.875,
        targetMargin: 35,
      },
    },
  },
  {
    name: "Private Dinner Party",
    description: "Intimate plated dinner for small gatherings",
    template_data: {
      guest_count: 20,
      event_type: "dinner",
      pricing_data: {
        menuItems: [
          { name: "3-Course Plated Dinner", costPerUnit: 55, quantity: 20 },
          { name: "Wine Pairing", costPerUnit: 18, quantity: 20 },
        ],
        staffing: [
          { role: "Private Chef", hourlyRate: 40, hours: 6, count: 1 },
          { role: "Server", hourlyRate: 25, hours: 5, count: 1 },
        ],
        rentals: [],
        barPackage: "beer_wine",
        adminPercent: 20,
        taxPercent: 8.875,
        targetMargin: 40,
      },
    },
  },
  {
    name: "Nonprofit Gala",
    description: "Formal fundraiser gala with full service",
    template_data: {
      guest_count: 200,
      event_type: "gala",
      pricing_data: {
        menuItems: [
          { name: "Reception Canapes", costPerUnit: 10, quantity: 200 },
          { name: "Plated 4-Course Dinner", costPerUnit: 55, quantity: 200 },
          { name: "Dessert Station", costPerUnit: 8, quantity: 200 },
        ],
        staffing: [
          { role: "Server", hourlyRate: 25, hours: 8, count: 10 },
          { role: "Head Chef", hourlyRate: 35, hours: 10, count: 1 },
          { role: "Sous Chef", hourlyRate: 28, hours: 10, count: 3 },
          { role: "Bartender", hourlyRate: 25, hours: 7, count: 3 },
          { role: "Event Captain", hourlyRate: 30, hours: 9, count: 1 },
        ],
        rentals: [
          { name: "China Place Setting", unitCost: 3, quantity: 200 },
          { name: "Glassware", unitCost: 2, quantity: 200 },
          { name: "Linen Napkins", unitCost: 1.5, quantity: 200 },
        ],
        barPackage: "full",
        adminPercent: 22,
        taxPercent: 8.875,
        targetMargin: 35,
      },
    },
  },
];
