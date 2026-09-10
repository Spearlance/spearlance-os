import { describe, expect, it } from "vitest";
import {
  EMPTY_LOCATION,
  formatAddress,
  formatHours,
  formatPhone,
  formatTime,
  locationProblem,
  normalizeLocation,
  phoneDigits,
} from "../clientLocations";

describe("phone", () => {
  it("extracts digits and formats US numbers", () => {
    expect(phoneDigits("(603) 555-0100")).toBe("6035550100");
    expect(phoneDigits("")).toBeNull();
    expect(formatPhone("603.555.0100")).toBe("(603) 555-0100");
    expect(formatPhone("+1 603 555 0100")).toBe("(603) 555-0100");
    expect(formatPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });
});

describe("formatAddress", () => {
  it("joins the parts that exist", () => {
    expect(formatAddress({ address_line1: "123 Main St", city: "Concord", state: "NH", postal_code: "03301", country: "US" }))
      .toBe("123 Main St, Concord, NH 03301");
    expect(formatAddress({ address_line1: "1 Rd", address_line2: "Suite 4", city: "Tampa", state: "FL" }))
      .toBe("1 Rd, Suite 4, Tampa, FL");
    expect(formatAddress({ city: "Toronto", state: "ON", country: "CA" })).toBe("Toronto, ON, CA");
    expect(formatAddress({})).toBe("");
  });
});

describe("hours", () => {
  it("formats times", () => {
    expect(formatTime("08:00")).toBe("8:00 AM");
    expect(formatTime("12:30")).toBe("12:30 PM");
    expect(formatTime("00:15")).toBe("12:15 AM");
    expect(formatTime("nope")).toBe("nope");
  });

  it("collapses identical consecutive days", () => {
    const wk = [{ open: "08:00", close: "17:00" }];
    expect(formatHours({ mon: wk, tue: wk, wed: wk, thu: wk, fri: wk, sat: [{ open: "09:00", close: "12:00" }], sun: [] }))
      .toEqual(["Mon – Fri: 8:00 AM – 5:00 PM", "Sat: 9:00 AM – 12:00 PM", "Sun: Closed"]);
  });

  it("treats missing days as closed and {} as unknown", () => {
    expect(formatHours({ mon: [{ open: "09:00", close: "17:00" }] }))
      .toEqual(["Mon: 9:00 AM – 5:00 PM", "Tue – Sun: Closed"]);
    expect(formatHours({})).toEqual([]);
    expect(formatHours(null)).toEqual([]);
  });
});

describe("locationProblem / normalizeLocation", () => {
  it("requires something worth checking", () => {
    expect(locationProblem({ ...EMPTY_LOCATION })).toMatch(/at least/);
    expect(locationProblem({ ...EMPTY_LOCATION, phone: "603-555-0100" })).toBeNull();
    expect(locationProblem({ ...EMPTY_LOCATION, label: " " , phone: "603-555-0100" })).toMatch(/label/);
    expect(locationProblem({ ...EMPTY_LOCATION, phone: "call us" })).toMatch(/digits/);
    expect(locationProblem({ ...EMPTY_LOCATION, phone: "6035550100", email: "nope" })).toMatch(/email/);
    expect(locationProblem({ ...EMPTY_LOCATION, hours: { mon: [{ open: "17:00", close: "08:00" }] } })).toMatch(/after/);
    expect(locationProblem({ ...EMPTY_LOCATION, hours: { mon: [{ open: "8am", close: "17:00" }] } })).toMatch(/HH:MM/);
  });

  it("normalizes blanks, casing and phone format", () => {
    const n = normalizeLocation({
      ...EMPTY_LOCATION,
      label: "  ",
      phone: "603.555.0100",
      email: " Office@Acme.com ",
      state: "nh",
      country: "us",
      address_line2: "",
      hours: { mon: [{ open: "08:00", close: "17:00" }], sun: [] },
    });
    expect(n.label).toBe("Main location");
    expect(n.phone).toBe("(603) 555-0100");
    expect(n.email).toBe("office@acme.com");
    expect(n.state).toBe("NH");
    expect(n.country).toBe("US");
    expect(n.address_line2).toBeNull();
    expect(n.hours).toEqual({ mon: [{ open: "08:00", close: "17:00" }], sun: [] });
  });
});
