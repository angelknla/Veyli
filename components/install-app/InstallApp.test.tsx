// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import InstallApp from './InstallApp';

const installButton = { name: 'Install Veyli' };

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    value: vi.fn(),
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
}

it.each(['accepted', 'dismissed'] as const)('uses the native %s prompt once', async (outcome) => {
  render(<InstallApp />);
  expect(screen.queryByRole('button', installButton)).not.toBeInTheDocument();
  const { event, prompt } = offerInstall(outcome);
  expect(event.defaultPrevented).toBe(true);
  expect(prompt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', installButton));
  await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('button', installButton)).not.toBeInTheDocument());
});

it('hides the option after installation', () => {
  render(<InstallApp />);
  offerInstall();
  act(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });
  expect(screen.queryByRole('button', installButton)).not.toBeInTheDocument();
});

it('does not offer installation in standalone mode', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true }))
  );
  render(<InstallApp />);
  const { event } = offerInstall();
  expect(event.defaultPrevented).toBe(false);
  expect(screen.queryByRole('button', installButton)).not.toBeInTheDocument();
});

it('offers iPhone users the Add to Home Screen dialog', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone Safari');
  const showModal = vi.fn();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    value: showModal,
    configurable: true,
  });
  render(<InstallApp />);
  fireEvent.click(screen.getByRole('button', installButton));
  expect(showModal).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
});
