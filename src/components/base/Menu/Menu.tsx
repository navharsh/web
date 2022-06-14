import {
  defineComponent,
  inject,
  InjectionKey,
  LiHTMLAttributes,
  nextTick,
  provide,
  ref,
  Ref
} from 'vue';
import { Keys } from '~/types';

// hooks
import { useActiveElement } from '~/hooks';

enum Focus {
  First = 'first',
  Previous = 'previous',
  Next = 'next',
  Last = 'last'
}

interface Api {
  menuState: Ref<MenuState>;
  menuItemsRef: Ref<HTMLUListElement | undefined>;
  menuButtonRef: Ref<HTMLButtonElement | undefined>;
  closeMenu: () => void;
  openMenu: () => void;
  focus: (index: Focus | number) => void;
}

const MenuContext: InjectionKey<Api> = Symbol('MenuContext');

const useMenuContext = (component: string) => {
  const ctx = inject(MenuContext);

  if (!ctx) throw new Error(`<${component}> is missing a parent <Menu /> component.`);

  return ctx;
};

enum MenuState {
  Opened,
  Closed
}

interface MenuProps {}

export const Menu = defineComponent<MenuProps>((props, { slots }) => {
  const menuState = ref(MenuState.Closed);

  const menuItemsRef = ref<HTMLUListElement>();
  const menuButtonRef = ref<HTMLButtonElement>();

  const activeElement = useActiveElement();

  const closeMenu = () => {
    menuState.value = MenuState.Closed;
  };

  const openMenu = () => {
    menuState.value = MenuState.Opened;
  };

  const focus = (index: Focus | number) => {
    switch (index) {
      case Focus.First:
        focus(0);
        break;
      case Focus.Last:
        (
          menuItemsRef.value?.children[menuItemsRef.value.children.length - 1] as
            | HTMLElement
            | undefined
        )?.focus();
        break;
      case Focus.Previous:
        focus([...activeElement.value?.parentElement?.children].indexOf(activeElement.value) - 1);
        break;
      case Focus.Next:
        focus([...activeElement.value?.parentElement?.children].indexOf(activeElement.value) + 1);
        break;
      default:
        (menuItemsRef.value?.children[index] as HTMLElement | undefined)?.focus();
        break;
    }
  };

  const api: Api = {
    menuState,
    menuItemsRef,
    menuButtonRef,
    closeMenu,
    openMenu,
    focus
  };

  provide(MenuContext, api);

  return () => <div class="relative h-max">{slots.default && slots.default()}</div>;
});

interface ButtonProps {}

export const MenuButton = defineComponent<ButtonProps>((props, { slots }) => {
  const api = useMenuContext('MenuButton');

  // https://www.w3.org/WAI/GL/wiki/Using_ARIA_menus
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case Keys.Space:
      case Keys.Enter:
      case Keys.ArrowDown:
      case Keys.ArrowUp:
        e.preventDefault();
        e.stopPropagation();
        api.openMenu();

        nextTick(() => {
          api.focus(Focus.First);
        });
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    switch (e.key) {
      case Keys.Space:
        // required for firefox, because the space key doesn't cancel the keyUp event
        e.preventDefault();
        break;
    }
  };

  const handleClick = (e: MouseEvent) => {
    api.menuState.value === MenuState.Opened ? api.closeMenu() : api.openMenu();
  };

  return () => (
    <>
      <button
        ref={api.menuButtonRef}
        onKeydown={handleKeyDown}
        onKeyup={handleKeyUp}
        onClick={handleClick}
        class="flex h-max gap-2 py-2 font-semibold text-white"
      >
        {slots.default && slots.default()}
      </button>
    </>
  );
});

export const MenuItems = defineComponent((props, { slots }) => {
  const api = useMenuContext('MenuItems');

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case Keys.Escape:
        e.preventDefault();
        e.stopPropagation();
        api.closeMenu();

        nextTick(() => {
          api.menuItemsRef.value?.focus();
        });
        break;
      case Keys.ArrowUp:
        e.preventDefault();
        e.stopPropagation();
        api.focus(Focus.Previous);
        break;
      case Keys.ArrowDown:
        e.preventDefault();
        e.stopPropagation();
        api.focus(Focus.Next);
    }
  };

  return () => {
    if (api.menuState.value === MenuState.Opened) {
      return (
        <div class="absolute z-20 mt-2 animate-fadeIn rounded-xl bg-bodySecundary py-3 shadow-xl">
          <ul ref={api.menuItemsRef} onKeydown={handleKeyDown}>
            {slots.default && slots.default()}
          </ul>
        </div>
      );
    }
  };
});

interface MenuItemProps extends LiHTMLAttributes {}

export const MenuItem = defineComponent<MenuItemProps>((props, { slots }) => {
  const api = useMenuContext('MenuItem');

  const handleClick = (e: MouseEvent) => {
    api.closeMenu();

    // set the focus back to the menu button
    nextTick(() => api.menuButtonRef.value?.focus());
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case Keys.Enter:
      case Keys.Space:
        e.preventDefault();
        e.stopPropagation();
        api.closeMenu();

        // set the focus back to the menu button
        nextTick(() => api.menuButtonRef.value?.focus());
        break;
    }
  };

  return () => (
    <li
      tabindex={0}
      onClick={handleClick}
      onKeydown={handleKeyDown}
      class="cursor-pointer select-none px-4 py-2 font-semibold text-white hover:bg-bodyPrimary/80 focus:bg-bodyPrimary/80 focus:outline-none"
    >
      {slots.default && slots.default()}
    </li>
  );
});