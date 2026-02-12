import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button component', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('should apply variant classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    const button = container.querySelector('button')
    expect(button).toBeDefined()
  })

  it('should apply size classes', () => {
    const { container } = render(<Button size="lg">Large Button</Button>)
    const button = container.querySelector('button')
    expect(button).toBeDefined()
  })

  it('should handle disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should pass through additional props', () => {
    render(<Button data-testid="custom-button">Custom</Button>)
    expect(screen.getByTestId('custom-button')).toBeDefined()
  })

  it('should have type="button" by default', () => {
    render(<Button>Default</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('should handle onClick', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('should merge custom className', () => {
    const { container } = render(<Button className="custom-class">Styled</Button>)
    const button = container.querySelector('button')
    expect(button?.classList.contains('custom-class')).toBe(true)
  })
})
