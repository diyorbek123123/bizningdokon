import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        map: 'Map',
        addStore: 'Add Store',
      },
      hero: {
        title: 'Find Shops & Products',
        subtitle: 'Discover local stores and products in Uzbekistan',
        search: 'Search for products...',
      },
      store: {
        contact: 'Contact',
        address: 'Address',
        products: 'Products',
        searchProducts: 'Search products...',
        price: 'Price',
        noProducts: 'No products found',
      },
      addStore: {
        title: 'Add New Store',
        name: 'Store Name',
        description: 'Description',
        phone: 'Phone Number',
        address: 'Address',
        latitude: 'Latitude',
        longitude: 'Longitude',
        photo: 'Photo URL',
        submit: 'Add Store',
        success: 'Store added successfully!',
        error: 'Failed to add store',
      },
      map: {
        title: 'Store Locations',
        clickStore: 'Click on a marker to view store details',
      },
    },
  },
  ru: {
    translation: {
      nav: {
        home: 'Главная',
        map: 'Карта',
        addStore: 'Добавить магазин',
      },
      hero: {
        title: 'Найти магазины и товары',
        subtitle: 'Откройте для себя местные магазины и товары в Узбекистане',
        search: 'Поиск товаров...',
      },
      store: {
        contact: 'Контакт',
        address: 'Адрес',
        products: 'Товары',
        searchProducts: 'Поиск товаров...',
        price: 'Цена',
        noProducts: 'Товары не найдены',
      },
      addStore: {
        title: 'Добавить новый магазин',
        name: 'Название магазина',
        description: 'Описание',
        phone: 'Номер телефона',
        address: 'Адрес',
        latitude: 'Широта',
        longitude: 'Долгота',
        photo: 'URL фото',
        submit: 'Добавить магазин',
        success: 'Магазин успешно добавлен!',
        error: 'Не удалось добавить магазин',
      },
      map: {
        title: 'Расположение магазинов',
        clickStore: 'Нажмите на маркер, чтобы увидеть детали магазина',
      },
    },
  },
  uz: {
    translation: {
      nav: {
        home: 'Bosh sahifa',
        map: 'Xarita',
        addStore: "Do'kon qo'shish",
      },
      hero: {
        title: "Do'konlar va mahsulotlarni toping",
        subtitle: "O'zbekistondagi mahalliy do'konlar va mahsulotlarni kashf eting",
        search: 'Mahsulotlarni qidirish...',
      },
      store: {
        contact: 'Aloqa',
        address: 'Manzil',
        products: 'Mahsulotlar',
        searchProducts: 'Mahsulotlarni qidirish...',
        price: 'Narx',
        noProducts: 'Mahsulotlar topilmadi',
      },
      addStore: {
        title: "Yangi do'kon qo'shish",
        name: "Do'kon nomi",
        description: 'Tavsif',
        phone: 'Telefon raqami',
        address: 'Manzil',
        latitude: 'Kenglik',
        longitude: 'Uzunlik',
        photo: 'Rasm URL',
        submit: "Do'kon qo'shish",
        success: "Do'kon muvaffaqiyatli qo'shildi!",
        error: "Do'kon qo'shib bo'lmadi",
      },
      map: {
        title: "Do'konlarning joylashuvi",
        clickStore: "Do'kon tafsilotlarini ko'rish uchun belgiga bosing",
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
