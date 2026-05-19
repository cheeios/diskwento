export interface OfficeContact {
  email?: string;
  phone?: string;
  address?: string;
  facebook?: string;
  hasData: boolean;
}

export interface LGUContact {
  city: string;
  pdao: OfficeContact;
  osca: OfficeContact;
}

export const METRO_MANILA_LGUS: LGUContact[] = [
  {
    city: 'Manila',
    pdao: {
      email: 'publicinfo@manila.gov.ph',
      phone: '8-527-1162',
      address: '2nd Floor, Office of the Mayor, Manila City Hall, Manila',
      facebook: 'https://www.facebook.com/ManilaPIO',
      hasData: true,
    },
    osca: {
      email: 'osca@manila.gov.ph',
      phone: '(02) 8527-0972',
      address: 'Antonio J. Villegas St. cor. Padre Burgos Ave., Ermita, Manila',
      facebook: 'https://www.facebook.com/ManilaOSCA/',
      hasData: true,
    },
  },
  {
    city: 'Quezon City',
    pdao: {
      email: 'PDAO@quezoncity.gov.ph',
      phone: '8988-4242 locals 8123, 7809',
      address: 'Ground Floor Community Center, Quezon City Hall Compound, Diliman, Quezon City',
      facebook: 'https://www.facebook.com/qcpdao25/',
      hasData: true,
    },
    osca: {
      email: 'OSCA@quezoncity.gov.ph',
      phone: '8988-4242 locals 1104, 8703-2843',
      address: 'Ground Floor Community Center Building, Gate-3 Quezon City Hall Complex, Kalayaan Avenue, Quezon City',
      facebook: 'https://www.facebook.com/qc.osca/',
      hasData: true,
    },
  },
  {
    city: 'Caloocan',
    pdao: {
      email: 'pdao@caloocancity.gov.ph',
      phone: '0992-911-7326',
      address: 'G/F, Caloocan City Hall, 8th Street, 8th Avenue, Caloocan City',
      facebook: 'https://www.facebook.com/pdaocal/',
      hasData: true,
    },
    osca: {
      email: 'osca@caloocancity.gov.ph',
      phone: '0928-288-8811',
      address: '8th Street, 8th Avenue, Brgy. 103 Gracepark, Caloocan City',
      facebook: 'https://www.facebook.com/oscacaloocan/',
      hasData: true,
    },
  },
  {
    city: 'Las Piñas',
    pdao: {
      email: 'laspinascitygov@yahoo.com',
      phone: '8283-3854',
      address: 'Alabang-Zapote Rd., Las Piñas City',
      facebook: 'https://www.facebook.com/cityoflaspinasofficial',
      hasData: true,
    },
    osca: {
      email: 'laspinascitygov@yahoo.com',
      phone: '8283-3854',
      address: 'Alabang-Zapote Rd., Las Piñas City',
      facebook: 'https://www.facebook.com/cityoflaspinasofficial',
      hasData: true,
    },
  },
  {
    city: 'Makati',
    pdao: {
      email: 'makatisocialwelfare@yahoo.com.ph',
      phone: '8870-1638',
      address: '5/F New Makati City Hall Building 1, J.P. Rizal St., Brgy. Poblacion, Makati City',
      facebook: 'https://www.facebook.com/MyMakatiVerified',
      hasData: true,
    },
    osca: {
      email: 'makati@makati.gov.ph',
      phone: '(02) 8899-9072',
      address: 'G/F New Makati City Hall Building, Makati City',
      facebook: 'https://www.facebook.com/MyMakatiVerified',
      hasData: true,
    },
  },
  {
    city: 'Malabon',
    pdao: {
      email: 'pdao@malabon.gov.ph',
      phone: '282-814-999',
      address: 'F. Sevilla Boulevard, Tañong, Malabon City',
      facebook: 'https://www.facebook.com/pdao.malaboncity/',
      hasData: true,
    },
    osca: {
      email: 'OSCA@malabon.gov.ph',
      phone: '286-938-538',
      address: 'OSCA Building, Ground Floor, F. Sevilla Blvd., San Agustin, Malabon City',
      facebook: 'https://www.facebook.com/oscamalabon/',
      hasData: true,
    },
  },
  {
    city: 'Mandaluyong',
    pdao: {
      email: 'dpad@mandaluyong.gov.ph',
      phone: '8532-5001 Local 811',
      address: 'City Government Complex, Maysilo Circle, Plainview, Mandaluyong City',
      facebook: 'https://www.facebook.com/PDADMandaluyong',
      hasData: true,
    },
    osca: {
      email: 'oscamandaluyong@gmail.com',
      phone: '872-119-925',
      address: 'Integrated Senior Citizens Center, Acacia Lane Ext., Brgy. Addition Hills, Mandaluyong City',
      facebook: 'https://www.facebook.com/OSCAMandaluyong/',
      hasData: true,
    },
  },
  {
    city: 'Marikina',
    pdao: {
      email: 'pdao@marikina.gov.ph',
      phone: '8687-2700',
      address: 'Marikina City Hall, Shoe Avenue, Sta. Elena, Marikina City 1800',
      facebook: 'https://www.facebook.com/MarikinaCityPIO/',
      hasData: true,
    },
    osca: {
      email: 'web@marikina.gov.ph',
      phone: '8659-1956',
      address: 'Marikina City Hall, Shoe Avenue, Sta. Elena, Marikina City 1800',
      facebook: 'https://www.facebook.com/MarikinaCityPIO/',
      hasData: true,
    },
  },
  {
    city: 'Muntinlupa',
    pdao: {
      email: 'pdaomunti@gmail.com',
      phone: '0991-079-1296',
      address: 'Ground Floor Ayala Malls South Park, Alabang, Muntinlupa City',
      facebook: 'https://www.facebook.com/muntipdao',
      hasData: true,
    },
    osca: {
      email: 'osca@muntinlupacity.gov.ph',
      phone: '992-976-5900',
      address: 'OSCA Center Baywalk, Bayanan, Muntinlupa City 1770',
      facebook: 'https://www.facebook.com/people/OSCAMuntinlupa/100064361125036/',
      hasData: true,
    },
  },
  {
    city: 'Navotas',
    pdao: {
      email: 'office.mayor@navotas.gov.ph',
      phone: '8-283-7415 loc. 701',
      address: 'M. Naval St., Sipac Almacen, Navotas City',
      facebook: 'https://www.facebook.com/navotenoako',
      hasData: true,
    },
    osca: {
      email: 'office.mayor@navotas.gov.ph',
      phone: '8-283-7415 loc. 701',
      address: 'M. Naval St., Sipac Almacen, Navotas City',
      facebook: 'https://www.facebook.com/navotenoako/',
      hasData: true,
    },
  },
  {
    city: 'Parañaque',
    pdao: {
      email: 'pio_paranaque@yahoo.com',
      phone: '(02) 8826-1686',
      address: 'Public Information Office, 4th Floor, Parañaque City Hall, Barangay San Antonio, Parañaque City',
      facebook: 'https://www.facebook.com/p/Cityof-Paranaque-Persons-with-Disability-Affairs-Office-100083565190086/',
      hasData: true,
    },
    osca: {
      email: 'pio_paranaque@yahoo.com',
      phone: '288-260-011',
      address: 'Public Information Office, 4th Floor, Parañaque City Hall, Barangay San Antonio, Parañaque City',
      facebook: 'https://www.facebook.com/pioparanaque/',
      hasData: true,
    },
  },
  {
    city: 'Pasay',
    pdao: {
      email: 'pio@pasay.gov.ph',
      phone: '(632) 381-1579',
      address: '2nd Floor, Room 214, Pasay City Hall Building, F.B. Harrison St., Pasay City 1300',
      facebook: 'https://www.facebook.com/lgupasaypio/',
      hasData: true,
    },
    osca: {
      email: 'pio@pasay.gov.ph',
      phone: '(632) 381-1579',
      address: '2nd Floor, Room 214, Pasay City Hall Building, F.B. Harrison St., Pasay City 1300',
      facebook: 'https://www.facebook.com/lgupasaypio/',
      hasData: true,
    },
  },
  {
    city: 'Pasig',
    pdao: {
      email: 'pdao@pasigcity.gov.ph',
      phone: '0928-343-5576',
      address: 'Persons with Disability Affairs Office, Tanghalang Pasigueño, Pasig City Hall Complex, Caruncho Avenue, Barangay San Nicolas, Pasig City',
      facebook: 'https://www.facebook.com/PDAOPasigCityOfficial/',
      hasData: true,
    },
    osca: {
      email: 'osca@pasigcity.gov.ph',
      phone: '864-311-111 loc. 1152',
      address: 'Tanghalang Pasigueño, Caruncho Ave., San Nicolas, Pasig City',
      facebook: 'https://www.facebook.com/pasigseniors/',
      hasData: true,
    },
  },
  {
    city: 'San Juan',
    pdao: {
      email: 'pdao@sanjuancity.gov.ph',
      phone: '(02) 7729-0005',
      address: 'Pinaglabanan cor. P. Narciso Sts., San Juan City 1500',
      facebook: 'https://www.facebook.com/SANJUANCITYPDAO/',
      hasData: true,
    },
    osca: {
      email: 'osca@sanjuancity.gov.ph',
      phone: '(02) 7729-0005',
      address: 'Pinaglabanan cor. P. Narciso Sts., San Juan City 1500',
      facebook: 'https://www.facebook.com/osca.san.juan/',
      hasData: true,
    },
  },
  {
    city: 'Taguig',
    pdao: {
      email: 'pdaotaguig@yahoo.com',
      phone: '277-959-947',
      address: 'Taguig City Hall, Taguig City',
      facebook: 'https://www.facebook.com/taguigpdao/',
      hasData: true,
    },
    osca: {
      email: 'oscataguig48@gmail.com',
      phone: '0969-212-9400',
      address: 'Gen. Luna St., Tuktukan, Taguig City',
      facebook: 'https://www.facebook.com/OSCATAGUIGOFFICIAL/',
      hasData: true,
    },
  },
  {
    city: 'Valenzuela',
    pdao: {
      email: 'info@valenzuela.gov.ph',
      phone: '8352-1000',
      address: 'Persons with Disability Affairs Office, Valenzuela City Hall, MacArthur Highway, Brgy. Karuhatan, Valenzuela City 1440',
      facebook: 'https://www.facebook.com/ValenzuelaCityGov',
      hasData: true,
    },
    osca: {
      email: 'info@valenzuela.gov.ph',
      phone: '8352-1000 local 1203 / 2148',
      address: '1st Floor Executive Building, New City Government Complex, MacArthur Highway, Brgy. Karuhatan, Valenzuela City 1440',
      facebook: 'https://www.facebook.com/ValenzuelaCityGov',
      hasData: true,
    },
  },
  {
    city: 'Pateros',
    pdao: {
      email: 'mayorjoey@pateros.gov.ph',
      phone: '8424-8370 Local 307',
      address: 'E. Ragas St., Pateros, Metro Manila',
      facebook: 'https://www.facebook.com/p/OSCA-Pateros100085454208314/',
      hasData: true,
    },
    osca: {
      email: 'mayorjoey@pateros.gov.ph',
      phone: '8424-8370 Local 307',
      address: 'E. Ragas St., Pateros, Metro Manila',
      facebook: 'https://www.facebook.com/p/OSCA-Pateros100085454208314/',
      hasData: true,
    },
  },
];
