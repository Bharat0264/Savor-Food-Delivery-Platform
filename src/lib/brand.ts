export const brand = {
  name: "savor",
  tagline: "Good things. Delivered.",
  city: "Bengaluru",
  currency: "INR",
  mark: "✳",
  colors: {
    ink: "#292225",
    cream: "#f7f5ef",
    lime: "#d9ef7b",
    purple: "#51405e",
  },
  description: "Your neighbourhood, at its most delicious.",
};
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
