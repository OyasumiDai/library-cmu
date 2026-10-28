-- Fills in the ISBN of the library's current books (looked up on Open Library, one English or Filipino edition each).
-- Run AFTER tools/add-isbn.sql, in Supabase > SQL Editor. Safe to run again; it only fills books that have no ISBN yet.
-- Each book's copies get their own codes (ISBN-01, ISBN-02...) automatically when its ISBN is set.
-- Footnote to Youth (1933) and Selected Stories of Francisco Arcellana (1960s) were printed before ISBNs existed,
-- so they keep none; their copies are coded from the book id instead (book_097-01...).
update public.books b set isbn = v.isbn
from (values
  ('book_001', '9781009432580'), -- Pride and Prejudice
  ('book_002', '9780142437247'), -- Moby-Dick
  ('book_003', '9780142437230'), -- Don Quixote
  ('book_004', '9780140449136'), -- Crime and Punishment
  ('book_005', '9780063087491'), -- The Great Gatsby
  ('book_006', '9780393870800'), -- Jane Eyre
  ('book_007', '9780241736388'), -- Wuthering Heights
  ('book_008', '9780147514011'), -- Little Women
  ('book_009', '9780143035008'), -- Anna Karenina
  ('book_010', '9780307389732'), -- Love in the Time of Cholera
  ('book_011', '9781382033398'), -- The War of the Worlds
  ('book_012', '9781455588572'), -- Frankenstein
  ('book_013', '9780571394388'), -- Nineteen Eighty-Four
  ('book_014', '9781407021027'), -- Brave New World
  ('book_015', '9781451673319'), -- Fahrenheit 451
  ('book_016', '9780063388468'), -- The Hobbit
  ('book_017', '9781350275515'), -- The Lion, the Witch and the Wardrobe
  ('book_018', '9781338878929'), -- Harry Potter and the Philosopher's Stone
  ('book_019', '9781473223561'), -- A Wizard of Earthsea
  ('book_020', '9780756404741'), -- The Name of the Wind
  ('book_021', '9781784878986'), -- Animal Farm
  ('book_022', '9780385490818'), -- The Handmaid's Tale
  ('book_023', '9780571374250'), -- Lord of the Flies
  ('book_024', '9780571390861'), -- Never Let Me Go
  ('book_025', '9781035410088'), -- Parable of the Sower
  ('book_026', '9780140437867'), -- The Hound of the Baskervilles
  ('book_027', '9780008255459'), -- Murder on the Orient Express
  ('book_028', '9780008392949'), -- And Then There Were None
  ('book_029', '9780486855356'), -- The Maltese Falcon
  ('book_030', '9780156001311'), -- The Name of the Rose
  ('book_031', '9781546766896'), -- Dracula
  ('book_032', '9780099511236'), -- The Turn of the Screw
  ('book_033', '9780141927541'), -- The Haunting of Hill House
  ('book_034', '9781473695498'), -- The Shining
  ('book_035', '9780063412934'), -- The Exorcist
  ('book_036', '9780141321004'), -- Treasure Island
  ('book_037', '9780241736470'), -- Robinson Crusoe
  ('book_038', '9780140449068'), -- Around the World in Eighty Days
  ('book_039', '9780593081501'), -- The Count of Monte Cristo
  ('book_040', '9781350359703'), -- Life of Pi
  ('book_041', '9780393930511'), -- Great Expectations
  ('book_042', '9781784875978'), -- To Kill a Mockingbird
  ('book_043', '9780241988794'), -- The Catcher in the Rye
  ('book_044', '9781526679673'), -- The Kite Runner
  ('book_045', '9781398550698'), -- A Separate Peace
  ('book_046', '9780486824925'), -- War and Peace
  ('book_047', '9781909621497'), -- Les Misérables
  ('book_048', '9781784871406'), -- Memoirs of a Geisha
  ('book_049', '9781760783693'), -- The Book Thief
  ('book_050', '9781455563913'), -- Pachinko
  ('book_051', '9780141439495'), -- Gulliver's Travels
  ('book_052', '9780713998818'), -- Candide
  ('book_053', '9781784878696'), -- Catch-22
  ('book_054', '9781784879693'), -- Slaughterhouse-Five
  ('book_055', '9780241980347'), -- The Grapes of Wrath
  ('book_056', '9781587314384'), -- Hamlet
  ('book_057', '9781847495136'), -- Macbeth
  ('book_058', '9781504062824'), -- Oedipus Rex
  ('book_059', '9780140481341'), -- Death of a Salesman
  ('book_060', '9781471853739'), -- A Streetcar Named Desire
  ('book_061', '9780679433132'), -- The Divine Comedy
  ('book_062', '9780198328773'), -- Paradise Lost
  ('book_063', '9780192894441'), -- Leaves of Grass
  ('book_064', '9781847498274'), -- The Prophet
  ('book_065', '9780199542970'), -- Rubáiyát of Omar Khayyam
  ('book_066', '9780141180861'), -- Ulysses
  ('book_067', '9780156628709'), -- Mrs Dalloway
  ('book_068', '9780679732242'), -- The Sound and the Fury
  ('book_069', '9780385474542'), -- Things Fall Apart
  ('book_070', '9780141032436'), -- One Hundred Years of Solitude
  ('book_071', '9789712739484'), -- Noli Me Tangere
  ('book_072', '9780143106395'), -- El Filibusterismo
  ('book_073', '9781015447684'), -- Florante at Laura
  ('book_074', '9789715081252'), -- Ibong Adarna
  ('book_075', '9789712734908'), -- Banaag at Sikat
  ('book_076', '9789718970089'), -- Mga Ibong Mandaragit
  ('book_077', '9789711790233'), -- Dekada '70
  ('book_078', '9780375751448'), -- Po-on
  ('book_079', '9780868615721'), -- Mass
  ('book_080', '9780143137238'), -- America Is in the Heart
  ('book_081', '9789715690157'), -- The Woman Who Had Two Navels
  ('book_082', '9780686095040'), -- The Pretenders
  ('book_083', '9780686264262'), -- My Brother, My Executioner
  ('book_084', '9789711790257'), -- Gapô
  ('book_085', '9789715690577'), -- The Bamboo Dancers
  ('book_086', '9781616955274'), -- Smaller and Smaller Circles
  ('book_087', '9780330510028'), -- Ilustrado
  ('book_088', '9789719430704'), -- Para Kay B
  ('book_089', '9789715508346'), -- The Quiet Ones
  ('book_090', '9789718845042'), -- Viajero
  ('book_091', '9789710545285'), -- ABNKKBSNPLAko?! (How Do You Pronounce That?)
  ('book_092', '9789719257417'), -- Alamat ng Gubat
  ('book_093', '9789710545032'), -- Ang Mga Kaibigan ni Mama Susan
  ('book_094', '9789710545490'), -- Si
  ('book_095', '9789715084741'), -- Janus Silang and the Creature of Tabon
  ('book_096', '9789715550413'), -- How My Brother Leon Brought Home a Wife and Other Stories
  ('book_098', '9789718967706'), -- The Tracks of Babylon and Other Poems
  ('book_099', '9789712738005')
) as v(id, isbn)
where b.id = v.id and b.isbn is null;

select count(*) filter (where isbn is not null) as books_with_isbn, count(*) as books,
       (select count(*) from public.book_copies) as copy_codes
from public.books;
