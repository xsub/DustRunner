import {t as msg} from './i18n.js';
// US model years. Layouts describe options offered within a generation, not
// every model year / market. Historical sources are linked in the game panel.
export const GENERATIONS=[
 {id:1,years:'1966–1977',layouts:msg("heritage.inline_6_small_block_v8"),fuel:msg("heritage.carbureted"),title:msg("heritage.the_compact_original"),story:msg("heritage.a_short_wheelbase_off_roader_with"),engines:['170','289','302','200']},
 {id:2,years:'1978–1979',layouts:msg("heritage.351m_400_v8_335_family"),fuel:msg("heritage.carbureted"),title:msg("heritage.going_full_size"),story:msg("heritage.bronco_moved_onto_a_shortened_f"),engines:['351m','400']},
 {id:3,years:'1980–1986',layouts:msg("heritage.inline_6_small_block_v8_2"),fuel:msg("heritage.carbureted_early_efi"),title:msg("heritage.comfort_meets_the_trail"),story:msg("heritage.a_lighter_full_size_body_and"),engines:['300','302','351m','351w','302efi']},
 {id:4,years:'1987–1991',layouts:msg("heritage.inline_6_small_block_v8"),fuel:msg("heritage.transition_to_efi_19871988"),title:msg("heritage.the_aerodynamic_age"),story:msg("heritage.a_smoother_nose_and_a_revised"),engines:['300efi','302efi','351w','351wefi']},
 {id:5,years:'1992–1996',layouts:msg("heritage.inline_6_small_block_v8_3"),fuel:msg("heritage.multi_port_efi"),title:msg("heritage.the_final_classic_chapter"),story:msg("heritage.the_last_classic_generation_refined_the"),engines:['300efi','302efi','351wefi']}
];
