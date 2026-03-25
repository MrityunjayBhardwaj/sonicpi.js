/**
 * Sample catalog — lists all available Sonic Pi samples with metadata.
 * Supports search, filtering by category, and preview playback.
 */

export interface SampleInfo {
  name: string
  category: string
}

const SAMPLES: SampleInfo[] = [
  // Bass drums
  { name: 'bd_808', category: 'bass drum' },
  { name: 'bd_boom', category: 'bass drum' },
  { name: 'bd_fat', category: 'bass drum' },
  { name: 'bd_gas', category: 'bass drum' },
  { name: 'bd_haus', category: 'bass drum' },
  { name: 'bd_klub', category: 'bass drum' },
  { name: 'bd_pure', category: 'bass drum' },
  { name: 'bd_tek', category: 'bass drum' },
  { name: 'bd_zum', category: 'bass drum' },

  // Snares
  { name: 'sn_dolf', category: 'snare' },
  { name: 'sn_dub', category: 'snare' },
  { name: 'sn_generic', category: 'snare' },
  { name: 'sn_zome', category: 'snare' },

  // Hi-hats
  { name: 'hat_bdu', category: 'hi-hat' },
  { name: 'hat_cab', category: 'hi-hat' },
  { name: 'hat_cats', category: 'hi-hat' },
  { name: 'hat_em', category: 'hi-hat' },
  { name: 'hat_gem', category: 'hi-hat' },
  { name: 'hat_metal', category: 'hi-hat' },
  { name: 'hat_noiz', category: 'hi-hat' },
  { name: 'hat_raw', category: 'hi-hat' },
  { name: 'hat_snap', category: 'hi-hat' },
  { name: 'hat_star', category: 'hi-hat' },
  { name: 'hat_tap', category: 'hi-hat' },
  { name: 'hat_zild', category: 'hi-hat' },

  // Loops
  { name: 'loop_amen', category: 'loop' },
  { name: 'loop_amen_full', category: 'loop' },
  { name: 'loop_breakbeat', category: 'loop' },
  { name: 'loop_compus', category: 'loop' },
  { name: 'loop_garzul', category: 'loop' },
  { name: 'loop_industrial', category: 'loop' },
  { name: 'loop_mika', category: 'loop' },
  { name: 'loop_safari', category: 'loop' },
  { name: 'loop_tabla', category: 'loop' },

  // Ambient
  { name: 'ambi_choir', category: 'ambient' },
  { name: 'ambi_dark_woosh', category: 'ambient' },
  { name: 'ambi_drone', category: 'ambient' },
  { name: 'ambi_glass_hum', category: 'ambient' },
  { name: 'ambi_glass_rub', category: 'ambient' },
  { name: 'ambi_haunted_hum', category: 'ambient' },
  { name: 'ambi_lunar_land', category: 'ambient' },
  { name: 'ambi_piano', category: 'ambient' },
  { name: 'ambi_sauna', category: 'ambient' },
  { name: 'ambi_soft_buzz', category: 'ambient' },
  { name: 'ambi_swoosh', category: 'ambient' },

  // Bass
  { name: 'bass_dnb_f', category: 'bass' },
  { name: 'bass_drop_c', category: 'bass' },
  { name: 'bass_hard_c', category: 'bass' },
  { name: 'bass_hit_c', category: 'bass' },
  { name: 'bass_thick_c', category: 'bass' },
  { name: 'bass_voxy_c', category: 'bass' },
  { name: 'bass_voxy_hit_c', category: 'bass' },
  { name: 'bass_woodsy_c', category: 'bass' },

  // Electronic
  { name: 'elec_beep', category: 'electronic' },
  { name: 'elec_bell', category: 'electronic' },
  { name: 'elec_blip', category: 'electronic' },
  { name: 'elec_blip2', category: 'electronic' },
  { name: 'elec_blup', category: 'electronic' },
  { name: 'elec_bong', category: 'electronic' },
  { name: 'elec_chime', category: 'electronic' },
  { name: 'elec_cymbal', category: 'electronic' },
  { name: 'elec_filt_snare', category: 'electronic' },
  { name: 'elec_flip', category: 'electronic' },
  { name: 'elec_fuzz_tom', category: 'electronic' },
  { name: 'elec_hollow_kick', category: 'electronic' },
  { name: 'elec_lo_snare', category: 'electronic' },
  { name: 'elec_mid_snare', category: 'electronic' },
  { name: 'elec_ping', category: 'electronic' },
  { name: 'elec_plip', category: 'electronic' },
  { name: 'elec_pop', category: 'electronic' },
  { name: 'elec_snare', category: 'electronic' },
  { name: 'elec_soft_kick', category: 'electronic' },
  { name: 'elec_tick', category: 'electronic' },
  { name: 'elec_triangle', category: 'electronic' },
  { name: 'elec_twang', category: 'electronic' },
  { name: 'elec_twip', category: 'electronic' },
  { name: 'elec_wood', category: 'electronic' },

  // Percussion
  { name: 'perc_bell', category: 'percussion' },
  { name: 'perc_snap', category: 'percussion' },
  { name: 'perc_snap2', category: 'percussion' },
  { name: 'perc_swoosh', category: 'percussion' },
  { name: 'perc_till', category: 'percussion' },

  // Tabla
  { name: 'tabla_dhec', category: 'tabla' },
  { name: 'tabla_ghe1', category: 'tabla' },
  { name: 'tabla_ghe2', category: 'tabla' },
  { name: 'tabla_ghe3', category: 'tabla' },
  { name: 'tabla_ghe4', category: 'tabla' },
  { name: 'tabla_ghe5', category: 'tabla' },
  { name: 'tabla_ghe6', category: 'tabla' },
  { name: 'tabla_ghe7', category: 'tabla' },
  { name: 'tabla_ghe8', category: 'tabla' },
  { name: 'tabla_ke1', category: 'tabla' },
  { name: 'tabla_ke2', category: 'tabla' },
  { name: 'tabla_ke3', category: 'tabla' },
  { name: 'tabla_na', category: 'tabla' },
  { name: 'tabla_na_o', category: 'tabla' },
  { name: 'tabla_na_s', category: 'tabla' },
  { name: 'tabla_re', category: 'tabla' },
  { name: 'tabla_tas1', category: 'tabla' },
  { name: 'tabla_tas2', category: 'tabla' },
  { name: 'tabla_tas3', category: 'tabla' },
  { name: 'tabla_te1', category: 'tabla' },
  { name: 'tabla_te2', category: 'tabla' },
  { name: 'tabla_te_m', category: 'tabla' },
  { name: 'tabla_te_ne', category: 'tabla' },
  { name: 'tabla_tun1', category: 'tabla' },
  { name: 'tabla_tun2', category: 'tabla' },
  { name: 'tabla_tun3', category: 'tabla' },

  // Vinyl
  { name: 'vinyl_backspin', category: 'vinyl' },
  { name: 'vinyl_hiss', category: 'vinyl' },
  { name: 'vinyl_rewind', category: 'vinyl' },
  { name: 'vinyl_scratch', category: 'vinyl' },
]

/** Get all samples. */
export function getAllSamples(): SampleInfo[] {
  return SAMPLES
}

/** Get all category names. */
export function getCategories(): string[] {
  return [...new Set(SAMPLES.map(s => s.category))]
}

/** Get samples in a category. */
export function getSamplesByCategory(category: string): SampleInfo[] {
  return SAMPLES.filter(s => s.category === category)
}

/** Search samples by name (fuzzy). */
export function searchSamples(query: string): SampleInfo[] {
  const q = query.toLowerCase()
  return SAMPLES.filter(s => s.name.toLowerCase().includes(q))
}

/** Get all sample names. */
export function getSampleNames(): string[] {
  return SAMPLES.map(s => s.name)
}
