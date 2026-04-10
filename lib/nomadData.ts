import { readFileSync } from "fs";
import { join } from "path";

export interface NomadCityData {
    en: string;
    visa: {
        hasNomadVisa: boolean;
        visaName: string | null;
        durationMonths: number | null;
        minIncomeUsd: number | null;
        taxOnForeignIncome: string | null;
        note: string | null;
    } | null;
    visaFreeDays: number | null;
    shortTermRentUsd: number | null;
    coworking: {
        compositeScore: number | null;
        freeWifiRating: string | null;
        powerGridRating: string | null;
        internetMbps: number | null;
    } | null;
    english: {
        efEpiScore: number | null;
        efEpiBand: string | null;
        cityRating: string | null;
    } | null;
    internet: {
        downloadMbps: number | null;
        vpnRestricted: boolean | string;
        vpnNote: string | null;
    } | null;
    timezoneOverlap: {
        utcOffsetHours: number;
        overlapWithUSEast: number;
        overlapWithUSWest: number;
        overlapWithLondon: number;
        overlapWithEast8?: number;
    } | null;
    nomadCommunity: {
        nomadScore: number | null;
        globalRank: number | null;
        reviewCount: number | null;
    } | null;
    nomadMonthlyCost: number | null;
}

export interface VisaFreeMatrix {
    [country: string]: { CN: number | null; US: number | null; EU: number | null; JP: number | null };
}

let _nomadData: Record<string, NomadCityData> | null = null;
let _visaMatrix: VisaFreeMatrix | null = null;

export function loadNomadData(): Record<string, NomadCityData> {
    if (_nomadData) return _nomadData;
    try {
        const raw = readFileSync(join(process.cwd(), "public", "data", "nomad-data-compiled.json"), "utf-8");
        const parsed = JSON.parse(raw);
        _nomadData = parsed.cities as Record<string, NomadCityData>;
        return _nomadData;
    } catch {
        return {};
    }
}

export function loadVisaMatrix(): VisaFreeMatrix {
    if (_visaMatrix) return _visaMatrix;
    try {
        const raw = readFileSync(join(process.cwd(), "public", "data", "nomad-visafree-4passport.json"), "utf-8");
        const parsed = JSON.parse(raw);
        _visaMatrix = parsed.matrix as VisaFreeMatrix;
        return _visaMatrix;
    } catch {
        return {};
    }
}

export function getNomadCityData(cityId: number): NomadCityData | null {
    const data = loadNomadData();
    return data[String(cityId)] || null;
}
